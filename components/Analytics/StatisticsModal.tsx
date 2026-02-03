'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import styles from './StatisticsModal.module.css';

type AnalyticsData = {
  kpis: {
    uniqueVisitors: number;
    totalViews: number;
    avgTimePerPageSeconds: number;
    bounceRatePercent: number;
    avgPagesPerVisit: number;
  };
  trafficLast30Days: { date: string; views: number; visitors: number }[];
  topContent: { path: string; views: number; avgTime: number }[];
  byCountry: { country: string; count: number; avgTimeSeconds?: number }[];
  byCity: { country: string; city: string; count: number; avgTimeSeconds?: number }[];
  topClicks: { path: string; element_id: string; count: number }[];
  bySource?: { source: string; browser: string; count: number; avgTimeSeconds?: number }[];
  visitsByPage?: { path: string; uniqueVisitors: number; avgTimeSeconds?: number }[];
  filterApplied: { include: boolean; exclude: boolean };
};

type IpFilter = { include: string[]; exclude: string[] };

const defaultFilter: IpFilter = { include: [], exclude: [] };

function parseFilter(val: unknown): IpFilter {
  if (!val || typeof val !== 'string') return defaultFilter;
  try {
    const p = JSON.parse(val) as { include?: string[]; exclude?: string[] };
    return {
      include: Array.isArray(p.include) ? p.include : [],
      exclude: Array.isArray(p.exclude) ? p.exclude : [],
    };
  } catch {
    return defaultFilter;
  }
}

export default function StatisticsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type PeriodValue = '7d' | '30d' | '90d' | 'current_month' | 'last_month';
  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [ipFilter, setIpFilter] = useState<IpFilter>(defaultFilter);
  const [filterDirty, setFilterDirty] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterTab, setFilterTab] = useState<'include' | 'exclude'>('include');
  const [lastSavedFilter, setLastSavedFilter] = useState<IpFilter>(defaultFilter);
  const [dataTab, setDataTab] = useState<'content' | 'geo' | 'clicks' | 'source' | 'visitsByPage'>('content');
  const [myIp, setMyIp] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError('Non connecté');
        return;
      }
      const params = new URLSearchParams();
      if (period === 'current_month' || period === 'last_month') {
        params.set('period', period);
      } else {
        const daysNum = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        params.set('days', String(daysNum));
      }
      const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `Erreur ${res.status}`);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/site-settings?keys=analytics_ip_filter')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        const raw = json?.settings?.analytics_ip_filter;
        const f = parseFilter(raw);
        setIpFilter(f);
        setLastSavedFilter(f);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || !session?.access_token) return;
      fetch('/api/admin/analytics/my-ip', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((j) => { if (mounted && j?.ip) setMyIp(j.ip); })
        .catch(() => {});
    });
    return () => { mounted = false; };
  }, []);

  const saveIpFilter = async () => {
    setSavingFilter(true);
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'analytics_ip_filter',
          value: JSON.stringify(ipFilter),
        }),
      });
      setLastSavedFilter(ipFilter);
      setFilterDirty(false);
      fetchAnalytics();
    } catch (_) {}
    finally {
      setSavingFilter(false);
    }
  };

  const addFilterIp = (kind: 'include' | 'exclude', ip: string) => {
    const trimmed = ip.trim();
    if (!trimmed) return;
    setIpFilter((prev) => ({
      ...prev,
      [kind]: [...(prev[kind].includes(trimmed) ? prev[kind] : [...prev[kind], trimmed])],
    }));
    setFilterDirty(true);
  };

  const removeFilterIp = (kind: 'include' | 'exclude', ip: string) => {
    setIpFilter((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((x) => x !== ip),
    }));
    setFilterDirty(true);
  };

  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch {
      return d;
    }
  };

  const formatDurationSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds} s`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min} min ${sec} s` : `${min} min`;
  };

  const PAGE_LABELS: Record<string, string> = {
    '/': 'Accueil',
    '/contact': 'Contact',
    '/realisation': 'Réalisation',
    '/portrait': 'Portrait',
    '/galeries': 'Galeries',
    '/galleries': 'Galeries',
    '/corporate': 'Corporate',
    '/evenement': 'Événement',
    '/animation': 'Animation',
    '/admin': 'Admin',
    '/services': 'Services',
  };

  const getPageLabel = (path: string) => {
    const p = (path || '/').replace(/\/+$/, '') || '/';
    if (p === '' || p === '/') return 'Accueil';
    const known = PAGE_LABELS[p] || PAGE_LABELS[p + '/'];
    if (known) return known;
    const segment = p.slice(1).split('/')[0];
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Page';
  };

  const TYPE_LABELS: Record<string, string> = {
    'lien': 'Lien',
    'lien interne': 'Lien interne',
    'lien externe': 'Lien vers Extérieur',
    'bouton': 'Bouton',
    'bouton bloc': 'Bouton bloc',
    'menu': 'Menu',
    'menu mobile': 'Menu mobile',
    'image': 'Image',
    'image galerie': 'Image galerie',
    'élément': 'Élément',
    'id': 'Élément',
    'inconnu': 'Inconnu',
  };

  const formatClickDetail = (d: string) => (d || '').toLowerCase() === 'maxcellens' ? 'Logo-Maxcellens' : (d || '');

  const formatClickRow = (path: string | undefined, elementId: string) => {
    const pageLabel = getPageLabel(path ?? '/');
    const pagePrefix = `Page ${pageLabel}`;
    const raw = (elementId || '').trim();
    if (!raw) return `${pagePrefix} / Inconnu`;
    const lower = raw.toLowerCase();
    if (lower === 'unknown' || lower === 'undefined') return `${pagePrefix} / Inconnu`;
    const pipe = raw.indexOf('|');
    if (pipe >= 0) {
      const type = raw.slice(0, pipe).trim().toLowerCase();
      const detail = raw.slice(pipe + 1).trim();
      const typeLabel = TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
      if (!detail) return `${pagePrefix} / ${typeLabel}`;
      return `${pagePrefix} / ${typeLabel} / ${formatClickDetail(detail)}`;
    }
    if (lower.startsWith('mailto:')) return `${pagePrefix} / Lien vers Extérieur / Email`;
    try {
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        const url = new URL(raw);
        const p = url.pathname?.replace(/\/+$/, '') || '/';
        const label = PAGE_LABELS[p] || PAGE_LABELS[p + '/'] || (p === '/' ? 'Accueil' : p.slice(1).split('/')[0] || 'Lien');
        return `${pagePrefix} / Lien vers Extérieur / ${label}`;
      }
    } catch (_) {}
    return `${pagePrefix} / Inconnu`;
  };

  return (
    <div
      className={styles.overlay}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={styles.modalBox}
        style={{
          background: '#fff',
          borderRadius: 12,
          maxWidth: 960,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#111827' }}>Statistiques</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodValue)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', color: '#1e293b', fontWeight: 500 }}
            >
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
              <option value="current_month">Mois en cours</option>
              <option value="last_month">Mois dernier</option>
            </select>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#475569' }}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontWeight: 500 }}>Chargement…</div>
        )}
        {error && (
          <div style={{ padding: '1rem 1.25rem', color: '#c00' }}>{error}</div>
        )}
        {!loading && !error && data && (
          <div className={styles.contentPadding}>
            {/* KPIs */}
            <div className={styles.kpiGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Visiteurs uniques</div>
                <div className={styles.kpiValue} style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{data.kpis.uniqueVisitors}</div>
              </div>
              <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Total vues</div>
                <div className={styles.kpiValue} style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{data.kpis.totalViews}</div>
              </div>
              <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Pages / visite</div>
                <div className={styles.kpiValue} style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{data.kpis.avgPagesPerVisit ?? 0}</div>
              </div>
              <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Temps moyen / page</div>
                <div className={styles.kpiValue} style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{formatDurationSeconds(data.kpis.avgTimePerPageSeconds)}</div>
              </div>
              <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: 600 }}>Taux de rebond</div>
                <div className={styles.kpiValue} style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{data.kpis.bounceRatePercent}%</div>
              </div>
            </div>

            {(data.filterApplied.include || data.filterApplied.exclude) && (
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 16, fontWeight: 500 }}>
                Filtre IP actif : {data.filterApplied.include ? 'inclure uniquement' : ''} {data.filterApplied.exclude ? 'exclure' : ''}
              </p>
            )}

            {/* Chart */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Évolution du trafic</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trafficLast30Days.map((d) => ({ ...d, dateLabel: formatDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                      formatter={(value: number) => [value, 'Vues']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
                    />
                    <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 3 }} name="Vues" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Onglets Top contenus — Par pays/ville — Éléments les plus cliqués */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setDataTab('content')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${dataTab === 'content' ? '#2563eb' : '#cbd5e1'}`,
                    background: dataTab === 'content' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: dataTab === 'content' ? 600 : 500,
                    color: dataTab === 'content' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Top contenus (pages)
                </button>
                <button
                  type="button"
                  onClick={() => setDataTab('geo')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${dataTab === 'geo' ? '#2563eb' : '#cbd5e1'}`,
                    background: dataTab === 'geo' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: dataTab === 'geo' ? 600 : 500,
                    color: dataTab === 'geo' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Par pays / Par ville
                </button>
                <button
                  type="button"
                  onClick={() => setDataTab('clicks')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${dataTab === 'clicks' ? '#2563eb' : '#cbd5e1'}`,
                    background: dataTab === 'clicks' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: dataTab === 'clicks' ? 600 : 500,
                    color: dataTab === 'clicks' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Éléments les plus cliqués
                </button>
                <button
                  type="button"
                  onClick={() => setDataTab('source')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${dataTab === 'source' ? '#2563eb' : '#cbd5e1'}`,
                    background: dataTab === 'source' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: dataTab === 'source' ? 600 : 500,
                    color: dataTab === 'source' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Source
                </button>
                <button
                  type="button"
                  onClick={() => setDataTab('visitsByPage')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${dataTab === 'visitsByPage' ? '#2563eb' : '#cbd5e1'}`,
                    background: dataTab === 'visitsByPage' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: dataTab === 'visitsByPage' ? 600 : 500,
                    color: dataTab === 'visitsByPage' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Visites par page
                </button>
              </div>

              {dataTab === 'content' && (
                <div>
                  <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Top contenus (pages)</h3>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Page</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Vues</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Temps moyen (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topContent.map((row) => (
                          <tr key={row.path} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>Page {getPageLabel(row.path || '/')}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.views}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {dataTab === 'geo' && (
                <div className={styles.geoGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Par pays</h3>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Pays</th>
                            <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Visites</th>
                            <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Temps moyen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byCountry.map((row) => (
                            <tr key={row.country} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>{row.country}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Par ville</h3>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Ville / Pays</th>
                            <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Visites</th>
                            <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Temps moyen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byCity.map((row) => (
                            <tr key={`${row.country}-${row.city}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>{row.city} ({row.country})</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {dataTab === 'clicks' && (
                <div>
                  <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Éléments les plus cliqués</h3>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Élément / ID</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Clics</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topClicks.map((row) => (
                          <tr key={`${row.path ?? '/'}\t${row.element_id}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }} title={`${getPageLabel(row.path ?? '/')} — ${row.element_id}`}>{formatClickRow(row.path, row.element_id)}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {dataTab === 'source' && (
                <div>
                  <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Source des visiteurs</h3>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                    Provenance des visites : accès direct (saisie d&apos;URL ou favori), moteur de recherche (Google, Bing…), lien depuis un autre site.
                  </p>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Source</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Navigateur</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Visiteurs</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Temps moyen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.bySource ?? []).map((row, i) => (
                          <tr key={`${row.source}-${row.browser}-${i}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>{row.source}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>{row.browser ?? 'Inconnu'}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                          </tr>
                        ))}
                        {(data.bySource ?? []).length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ padding: '16px 14px', color: '#64748b', textAlign: 'center' }}>Aucune donnée (colonne referrer peut être absente en base)</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {dataTab === 'visitsByPage' && (
                <div>
                  <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Visites par page</h3>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                    Pour chaque page, nombre de visiteurs uniques ayant vu la page (sur la période et avec les filtres IP appliqués).
                  </p>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Page</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Visiteurs uniques</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Temps moyen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.visitsByPage ?? []).map((row) => (
                          <tr key={row.path} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>Page {getPageLabel(row.path || '/')}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.uniqueVisitors}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                          </tr>
                        ))}
                        {(data.visitsByPage ?? []).length === 0 && (
                          <tr>
                            <td colSpan={2} style={{ padding: '16px 14px', color: '#64748b', textAlign: 'center' }}>Aucune donnée</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* IP Filter */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24 }}>
              <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Filtre par IP</h3>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                Inclure uniquement ces IP : ne garder que les stats des visites dont l&apos;IP est dans la liste. Exclure ces IP : retirer des stats les visites dont l&apos;IP est dans la liste. Une IP par ligne.
              </p>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                En base, seuls des <strong>hash d&apos;IP</strong> sont stockés (pas l&apos;IP en clair), pour la confidentialité. Pour exclure un visiteur, utilisez le filtre ci‑dessous avec l&apos;IP exacte telle que vue par le serveur.
              </p>
              {myIp && (
                <div style={{ marginBottom: 12, padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Votre IP actuelle</span>
                  <span style={{ fontSize: 13, color: '#166534', marginLeft: 8 }}>(celle enregistrée quand vous visitez le site) : </span>
                  <code style={{ fontSize: 14, color: '#0f172a', marginLeft: 4 }}>{myIp}</code>
                  <button
                    type="button"
                    onClick={() => {
                      if (!myIp) return;
                      setIpFilter((prev) => ({
                        ...prev,
                        exclude: prev.exclude.includes(myIp) ? prev.exclude : [...prev.exclude, myIp],
                      }));
                      setFilterTab('exclude');
                      setFilterDirty(true);
                    }}
                    style={{ marginLeft: 12, padding: '4px 10px', fontSize: 12, background: '#166534', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                  >
                    Ajouter à Exclure
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setFilterTab('include')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${filterTab === 'include' ? '#2563eb' : '#cbd5e1'}`,
                    background: filterTab === 'include' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: filterTab === 'include' ? 600 : 500,
                    color: filterTab === 'include' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Inclure uniquement ces IP
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('exclude')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${filterTab === 'exclude' ? '#2563eb' : '#cbd5e1'}`,
                    background: filterTab === 'exclude' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: filterTab === 'exclude' ? 600 : 500,
                    color: filterTab === 'exclude' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Exclure ces IP
                </button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <textarea
                  value={ipFilter[filterTab].join('\n')}
                  onChange={(e) => {
                    const list = e.target.value.split(/\n/).map((s) => s.trim()).filter(Boolean);
                    setIpFilter((prev) => ({ ...prev, [filterTab]: list }));
                    setFilterDirty(true);
                  }}
                  placeholder={filterTab === 'include' ? '192.168.1.1\n10.0.0.1' : 'IP à exclure, une par ligne'}
                  rows={4}
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: 13, color: '#1e293b' }}
                />
              </div>
              {filterDirty && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={saveIpFilter}
                    disabled={savingFilter}
                    style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {savingFilter ? 'Enregistrement…' : 'Enregistrer le filtre'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIpFilter(lastSavedFilter); setFilterDirty(false); }}
                    style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
