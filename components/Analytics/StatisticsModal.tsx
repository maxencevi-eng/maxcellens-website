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
  visitors?: { ip: string | null; ip_hash: string | null; country: string; city: string; sessionCount: number }[];
  filterApplied: { include: boolean; exclude: boolean };
};

const PAGE_SIZE = 20;

type IpFilter = { include: string[]; exclude: string[]; excludeHashes?: string[] };

const defaultFilter: IpFilter = { include: [], exclude: [], excludeHashes: [] };

function parseFilter(val: unknown): IpFilter {
  if (!val || typeof val !== 'string') return defaultFilter;
  try {
    const p = JSON.parse(val) as { include?: string[]; exclude?: string[]; excludeHashes?: string[] };
    return {
      include: Array.isArray(p.include) ? p.include : [],
      exclude: Array.isArray(p.exclude) ? p.exclude : [],
      excludeHashes: Array.isArray(p.excludeHashes) ? p.excludeHashes : [],
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
  const [dataTab, setDataTab] = useState<'content' | 'geo' | 'clicks' | 'source' | 'visitsByPage' | 'visitors'>('content');
  const [myIp, setMyIp] = useState<string | null>(null);
  const [selectedVisitorHashes, setSelectedVisitorHashes] = useState<Set<string>>(new Set());
  const [hashAddedFeedback, setHashAddedFeedback] = useState<string | null>(null);
  const [purgingHashes, setPurgingHashes] = useState(false);
  const [purgeHashResult, setPurgeHashResult] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState(1);
  const [pageGeoCountry, setPageGeoCountry] = useState(1);
  const [pageGeoCity, setPageGeoCity] = useState(1);
  const [pageClicks, setPageClicks] = useState(1);
  const [pageSource, setPageSource] = useState(1);
  const [pageVisitsByPage, setPageVisitsByPage] = useState(1);
  const [pageVisitors, setPageVisitors] = useState(1);

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

  const formatCity = (raw: string) => {
    if (!raw || typeof raw !== 'string') return raw ?? '';
    try {
      return decodeURIComponent(String(raw).replace(/\+/g, ' '));
    } catch {
      return raw;
    }
  };

  const addIpToExclude = (ip: string | null) => {
    if (!ip || !ip.trim()) return;
    setIpFilter((prev) => ({
      ...prev,
      exclude: prev.exclude.includes(ip) ? prev.exclude : [...prev.exclude, ip],
    }));
    setFilterTab('exclude');
    setFilterDirty(true);
  };

  const addHashToExclude = (ip_hash: string | null) => {
    if (!ip_hash?.trim()) return;
    setIpFilter((prev) => {
      const list = prev.excludeHashes ?? [];
      if (list.includes(ip_hash)) return prev;
      return { ...prev, excludeHashes: [...list, ip_hash] };
    });
    setHashAddedFeedback(ip_hash.slice(0, 12) + '… ajouté');
    setTimeout(() => setHashAddedFeedback(null), 2500);
    setFilterDirty(true);
  };

  const addHashesToExclude = (hashes: string[]) => {
    const toAdd = hashes.filter((h) => h?.trim());
    if (toAdd.length === 0) return;
    setIpFilter((prev) => {
      const list = prev.excludeHashes ?? [];
      const set = new Set(list);
      toAdd.forEach((h) => set.add(h));
      return { ...prev, excludeHashes: Array.from(set) };
    });
    setSelectedVisitorHashes(new Set());
    setFilterDirty(true);
  };

  const removeHashFromExclude = (hash: string) => {
    setIpFilter((prev) => ({
      ...prev,
      excludeHashes: (prev.excludeHashes ?? []).filter((h) => h !== hash),
    }));
    setFilterDirty(true);
  };

  const runPurgeHashes = async () => {
    const hashes = ipFilter.excludeHashes ?? [];
    if (hashes.length === 0) {
      setPurgeHashResult('Aucun hash à purger. Ajoutez des hash dans "Exclure Hash" puis enregistrez.');
      return;
    }
    if (!confirm(`Supprimer définitivement les sessions et événements pour ${hashes.length} hash ?`)) return;
    setPurgingHashes(true);
    setPurgeHashResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setPurgeHashResult('Non connecté');
        return;
      }
      const res = await fetch('/api/admin/analytics/purge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPurgeHashResult(json?.error || `Erreur ${res.status}`);
        return;
      }
      const count = json?.deleted ?? 0;
      setPurgeHashResult(`${count} session(s) supprimée(s) pour ${hashes.length} hash.`);
      setIpFilter((prev) => ({ ...prev, excludeHashes: [] }));
      setFilterDirty(true);
      fetchAnalytics();
    } catch (e: unknown) {
      setPurgeHashResult(e instanceof Error ? e.message : String(e));
    } finally {
      setPurgingHashes(false);
    }
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
    'vidéo galerie': 'Vidéo galerie',
    'photo galerie': 'Photo galerie',
    'élément': 'Élément',
    'id': 'Clic identifié',
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
                <button
                  type="button"
                  onClick={() => setDataTab('visitors')}
                  style={{
                    padding: '8px 16px',
                    border: `2px solid ${dataTab === 'visitors' ? '#2563eb' : '#cbd5e1'}`,
                    background: dataTab === 'visitors' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: dataTab === 'visitors' ? 600 : 500,
                    color: dataTab === 'visitors' ? '#1d4ed8' : '#475569',
                  }}
                >
                  Visiteurs
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
                        {(data.topContent.slice((pageContent - 1) * PAGE_SIZE, pageContent * PAGE_SIZE)).map((row) => (
                          <tr key={row.path} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>Page {getPageLabel(row.path || '/')}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.views}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.topContent.length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                      <button type="button" onClick={() => setPageContent((p) => Math.max(1, p - 1))} disabled={pageContent <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageContent <= 1 ? 'not-allowed' : 'pointer', opacity: pageContent <= 1 ? 0.6 : 1 }}>Précédent</button>
                      <span style={{ color: '#475569' }}>Page {pageContent} / {Math.ceil(data.topContent.length / PAGE_SIZE)}</span>
                      <button type="button" onClick={() => setPageContent((p) => Math.min(Math.ceil(data.topContent.length / PAGE_SIZE), p + 1))} disabled={pageContent >= Math.ceil(data.topContent.length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageContent >= Math.ceil(data.topContent.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageContent >= Math.ceil(data.topContent.length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                    </div>
                  )}
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
                          {data.byCountry.slice((pageGeoCountry - 1) * PAGE_SIZE, pageGeoCountry * PAGE_SIZE).map((row) => (
                            <tr key={row.country} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatCity(row.country)}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {data.byCountry.length > PAGE_SIZE && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                        <button type="button" onClick={() => setPageGeoCountry((p) => Math.max(1, p - 1))} disabled={pageGeoCountry <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageGeoCountry <= 1 ? 'not-allowed' : 'pointer', opacity: pageGeoCountry <= 1 ? 0.6 : 1 }}>Précédent</button>
                        <span style={{ color: '#475569' }}>Page {pageGeoCountry} / {Math.ceil(data.byCountry.length / PAGE_SIZE)}</span>
                        <button type="button" onClick={() => setPageGeoCountry((p) => Math.min(Math.ceil(data.byCountry.length / PAGE_SIZE), p + 1))} disabled={pageGeoCountry >= Math.ceil(data.byCountry.length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageGeoCountry >= Math.ceil(data.byCountry.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageGeoCountry >= Math.ceil(data.byCountry.length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                      </div>
                    )}
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
                          {data.byCity.slice((pageGeoCity - 1) * PAGE_SIZE, pageGeoCity * PAGE_SIZE).map((row) => (
                            <tr key={`${row.country}-${row.city}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatCity(row.city)} ({formatCity(row.country)})</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {data.byCity.length > PAGE_SIZE && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                        <button type="button" onClick={() => setPageGeoCity((p) => Math.max(1, p - 1))} disabled={pageGeoCity <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageGeoCity <= 1 ? 'not-allowed' : 'pointer', opacity: pageGeoCity <= 1 ? 0.6 : 1 }}>Précédent</button>
                        <span style={{ color: '#475569' }}>Page {pageGeoCity} / {Math.ceil(data.byCity.length / PAGE_SIZE)}</span>
                        <button type="button" onClick={() => setPageGeoCity((p) => Math.min(Math.ceil(data.byCity.length / PAGE_SIZE), p + 1))} disabled={pageGeoCity >= Math.ceil(data.byCity.length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageGeoCity >= Math.ceil(data.byCity.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageGeoCity >= Math.ceil(data.byCity.length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                      </div>
                    )}
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
                        {(data.topClicks.slice((pageClicks - 1) * PAGE_SIZE, pageClicks * PAGE_SIZE)).map((row) => (
                          <tr key={`${row.path ?? '/'}\t${row.element_id}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }} title={`${getPageLabel(row.path ?? '/')} — ${row.element_id}`}>{formatClickRow(row.path, row.element_id)}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.topClicks.length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                      <button type="button" onClick={() => setPageClicks((p) => Math.max(1, p - 1))} disabled={pageClicks <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageClicks <= 1 ? 'not-allowed' : 'pointer', opacity: pageClicks <= 1 ? 0.6 : 1 }}>Précédent</button>
                      <span style={{ color: '#475569' }}>Page {pageClicks} / {Math.ceil(data.topClicks.length / PAGE_SIZE)}</span>
                      <button type="button" onClick={() => setPageClicks((p) => Math.min(Math.ceil(data.topClicks.length / PAGE_SIZE), p + 1))} disabled={pageClicks >= Math.ceil(data.topClicks.length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageClicks >= Math.ceil(data.topClicks.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageClicks >= Math.ceil(data.topClicks.length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                    </div>
                  )}
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
                        {((data.bySource ?? []).slice((pageSource - 1) * PAGE_SIZE, pageSource * PAGE_SIZE)).map((row, i) => (
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
                  {(data.bySource ?? []).length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                      <button type="button" onClick={() => setPageSource((p) => Math.max(1, p - 1))} disabled={pageSource <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageSource <= 1 ? 'not-allowed' : 'pointer', opacity: pageSource <= 1 ? 0.6 : 1 }}>Précédent</button>
                      <span style={{ color: '#475569' }}>Page {pageSource} / {Math.ceil((data.bySource ?? []).length / PAGE_SIZE)}</span>
                      <button type="button" onClick={() => setPageSource((p) => Math.min(Math.ceil((data.bySource ?? []).length / PAGE_SIZE), p + 1))} disabled={pageSource >= Math.ceil((data.bySource ?? []).length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageSource >= Math.ceil((data.bySource ?? []).length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageSource >= Math.ceil((data.bySource ?? []).length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                    </div>
                  )}
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
                        {((data.visitsByPage ?? []).slice((pageVisitsByPage - 1) * PAGE_SIZE, pageVisitsByPage * PAGE_SIZE)).map((row) => (
                          <tr key={row.path} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>Page {getPageLabel(row.path || '/')}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.uniqueVisitors}</td>
                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{formatDurationSeconds(row.avgTimeSeconds ?? 0)}</td>
                          </tr>
                        ))}
                        {(data.visitsByPage ?? []).length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ padding: '16px 14px', color: '#64748b', textAlign: 'center' }}>Aucune donnée</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(data.visitsByPage ?? []).length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                      <button type="button" onClick={() => setPageVisitsByPage((p) => Math.max(1, p - 1))} disabled={pageVisitsByPage <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageVisitsByPage <= 1 ? 'not-allowed' : 'pointer', opacity: pageVisitsByPage <= 1 ? 0.6 : 1 }}>Précédent</button>
                      <span style={{ color: '#475569' }}>Page {pageVisitsByPage} / {Math.ceil((data.visitsByPage ?? []).length / PAGE_SIZE)}</span>
                      <button type="button" onClick={() => setPageVisitsByPage((p) => Math.min(Math.ceil((data.visitsByPage ?? []).length / PAGE_SIZE), p + 1))} disabled={pageVisitsByPage >= Math.ceil((data.visitsByPage ?? []).length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageVisitsByPage >= Math.ceil((data.visitsByPage ?? []).length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageVisitsByPage >= Math.ceil((data.visitsByPage ?? []).length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                    </div>
                  )}
                </div>
              )}

              {dataTab === 'visitors' && (
                <div>
                  <h3 className={styles.sectionTitle} style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Visiteurs</h3>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                    Liste des visiteurs (IP, pays, ville) sur la période. Utilisez &quot;Exclure cette IP&quot; ou &quot;Exclure ce visiteur&quot; (si l&apos;IP n&apos;est pas affichée) pour retirer crawlers, trackers ou votre IP des stats, puis enregistrez le filtre ci-dessous. L&apos;IP peut rester vide si la migration Supabase (colonne ip) n&apos;a pas été exécutée.
                  </p>
                  {(data.visitors ?? []).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const visitors = data.visitors ?? [];
                          const selectedCountriesCities = new Set<string>();
                          selectedVisitorHashes.forEach((hash) => {
                            const row = visitors.find((r) => r.ip_hash === hash);
                            if (row) selectedCountriesCities.add(`${formatCity(row.country)}\t${formatCity(row.city)}`);
                          });
                          if (selectedCountriesCities.size === 0) return;
                          const toAdd = visitors
                            .filter((r) => r.ip_hash && selectedCountriesCities.has(`${formatCity(r.country)}\t${formatCity(r.city)}`))
                            .map((r) => r.ip_hash!);
                          setSelectedVisitorHashes((prev) => new Set([...prev, ...toAdd]));
                        }}
                        disabled={selectedVisitorHashes.size === 0}
                        style={{ padding: '6px 12px', fontSize: 12, background: selectedVisitorHashes.size ? '#e0e7ff' : '#f1f5f9', color: selectedVisitorHashes.size ? '#3730a3' : '#94a3b8', border: `1px solid ${selectedVisitorHashes.size ? '#a5b4fc' : '#e2e8f0'}`, borderRadius: 6, cursor: selectedVisitorHashes.size ? 'pointer' : 'not-allowed', fontWeight: 500 }}
                      >
                        Sélectionner même pays+ville que la sélection
                      </button>
                      <button
                        type="button"
                        disabled={selectedVisitorHashes.size === 0}
                        onClick={() => addHashesToExclude(Array.from(selectedVisitorHashes))}
                        style={{ padding: '6px 12px', fontSize: 12, background: selectedVisitorHashes.size ? '#fef3c7' : '#f1f5f9', color: selectedVisitorHashes.size ? '#92400e' : '#94a3b8', border: `1px solid ${selectedVisitorHashes.size ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 6, cursor: selectedVisitorHashes.size ? 'pointer' : 'not-allowed', fontWeight: 500 }}
                      >
                        Exclure les visiteurs sélectionnés ({selectedVisitorHashes.size})
                      </button>
                      {selectedVisitorHashes.size > 0 && (
                        <button type="button" onClick={() => setSelectedVisitorHashes(new Set())} style={{ padding: '6px 12px', fontSize: 12, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
                          Désélectionner tout
                        </button>
                      )}
                      {hashAddedFeedback && (
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>{hashAddedFeedback}</span>
                      )}
                    </div>
                  )}
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600, width: 40 }}>Sel.</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>IP</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Pays</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Ville</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Visites</th>
                          <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((data.visitors ?? []).slice((pageVisitors - 1) * PAGE_SIZE, pageVisitors * PAGE_SIZE)).map((row, i) => {
                          const hasHash = !!row.ip_hash;
                          const isSelected = hasHash && selectedVisitorHashes.has(row.ip_hash!);
                          return (
                            <tr key={`${row.ip_hash ?? row.ip ?? ''}-${row.country}-${row.city}-${i}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                                {hasHash ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedVisitorHashes((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(row.ip_hash!)) next.delete(row.ip_hash!);
                                        else next.add(row.ip_hash!);
                                        return next;
                                      });
                                    }}
                                    aria-label={`Sélectionner ${formatCity(row.country)} ${formatCity(row.city)}`}
                                  />
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontFamily: 'monospace', fontSize: 13 }}>{row.ip ?? '—'}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatCity(row.country)}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatCity(row.city)}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.sessionCount}</td>
                              <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                                {row.ip ? (
                                  <button
                                    type="button"
                                    onClick={() => addIpToExclude(row.ip)}
                                    style={{ padding: '4px 10px', fontSize: 12, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                                  >
                                    Exclure cette IP
                                  </button>
                                ) : row.ip_hash ? (
                                  <button
                                    type="button"
                                    onClick={() => addHashToExclude(row.ip_hash)}
                                    style={{ padding: '4px 10px', fontSize: 12, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                                    title="Exclure ce visiteur (IP non enregistrée, exclusion par identifiant)"
                                  >
                                    Exclure ce visiteur
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {(data.visitors ?? []).length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: '16px 14px', color: '#64748b', textAlign: 'center' }}>Aucun visiteur sur la période (ou colonne IP non migrée)</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(data.visitors ?? []).length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
                      <button type="button" onClick={() => setPageVisitors((p) => Math.max(1, p - 1))} disabled={pageVisitors <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageVisitors <= 1 ? 'not-allowed' : 'pointer', opacity: pageVisitors <= 1 ? 0.6 : 1 }}>Précédent</button>
                      <span style={{ color: '#475569' }}>Page {pageVisitors} / {Math.ceil((data.visitors ?? []).length / PAGE_SIZE)}</span>
                      <button type="button" onClick={() => setPageVisitors((p) => Math.min(Math.ceil((data.visitors ?? []).length / PAGE_SIZE), p + 1))} disabled={pageVisitors >= Math.ceil((data.visitors ?? []).length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageVisitors >= Math.ceil((data.visitors ?? []).length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageVisitors >= Math.ceil((data.visitors ?? []).length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
                    </div>
                  )}
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

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 8, marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#92400e' }}>Exclure Hash</h4>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  Hash des visiteurs à exclure des stats (ajoutés via &quot;Exclure ce visiteur&quot; ou &quot;Exclure les visiteurs sélectionnés&quot;). Gérés séparément des IP. Utilisez &quot;Purge Hash&quot; pour supprimer en base les données de ces hash.
                </p>
                <div style={{ marginBottom: 8 }}>
                  <textarea
                    value={(ipFilter.excludeHashes ?? []).join('\n')}
                    onChange={(e) => {
                      const list = e.target.value.split(/\n/).map((s) => s.trim()).filter(Boolean);
                      setIpFilter((prev) => ({ ...prev, excludeHashes: list }));
                      setFilterDirty(true);
                    }}
                    rows={3}
                    placeholder="Hash ajoutés via Exclure ce visiteur ou Exclure les visiteurs sélectionnés"
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #fcd34d', fontFamily: 'monospace', fontSize: 11, color: '#1e293b', background: '#fffbeb' }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const h = (ipFilter.excludeHashes ?? []).join('\n');
                      if (h) {
                        navigator.clipboard.writeText(h).then(() => setPurgeHashResult('Hash copiés dans le presse-papier.')).catch(() => setPurgeHashResult('Erreur copie'));
                        setTimeout(() => setPurgeHashResult(null), 3000);
                      }
                    }}
                    disabled={(ipFilter.excludeHashes ?? []).length === 0}
                    style={{ padding: '6px 12px', fontSize: 12, background: (ipFilter.excludeHashes ?? []).length ? '#fef3c7' : '#f1f5f9', color: (ipFilter.excludeHashes ?? []).length ? '#92400e' : '#94a3b8', border: '1px solid #fcd34d', borderRadius: 6, cursor: (ipFilter.excludeHashes ?? []).length ? 'pointer' : 'not-allowed' }}
                  >
                    Copier les hash
                  </button>
                  <button
                    type="button"
                    onClick={runPurgeHashes}
                    disabled={purgingHashes || (ipFilter.excludeHashes ?? []).length === 0}
                    style={{ padding: '6px 12px', fontSize: 12, background: purgingHashes || (ipFilter.excludeHashes ?? []).length === 0 ? '#f1f5f9' : '#dc2626', color: purgingHashes || (ipFilter.excludeHashes ?? []).length === 0 ? '#94a3b8' : '#fff', border: 'none', borderRadius: 6, cursor: purgingHashes || (ipFilter.excludeHashes ?? []).length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                  >
                    {purgingHashes ? 'Purge en cours…' : 'Purge Hash (supprimer les données de ces hash)'}
                  </button>
                  {purgeHashResult && (
                    <span style={{ fontSize: 12, color: purgeHashResult.startsWith('Erreur') || purgeHashResult.includes('Aucun') ? '#dc2626' : '#059669' }}>{purgeHashResult}</span>
                  )}
                </div>
                {(ipFilter.excludeHashes ?? []).length > 0 && (
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                    {(ipFilter.excludeHashes ?? []).length} hash. Cliquez sur &quot;Enregistrer le filtre&quot; ci-dessous pour persister l&apos;exclusion dans les stats.
                  </p>
                )}
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
