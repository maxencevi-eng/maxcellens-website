"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './ViewStatsModal.module.css';

type Period = 'days' | 'current_month' | 'last_month';
type View = 'stats' | 'visitors';

interface DayData { date: string; count: number; }
interface SourceData { source: string; count: number; }
interface VisitorData {
  ip: string | null;
  ip_hash: string;
  country: string;
  city: string;
  visits: number;
  lastVisit: string;
  source: string;
}
interface StatsData {
  totalViews: number;
  uniqueVisitors: number;
  directVisits: number;
  bySource: SourceData[];
  dailyVisits: DayData[];
  visitors: VisitorData[];
}

const SOURCE_COLORS: Record<string, string> = {
  Instagram: '#e1306c',
  Facebook: '#1877f2',
  YouTube: '#ff0000',
  TikTok: '#000',
  LinkedIn: '#0a66c2',
  'Twitter/X': '#000',
  Direct: '#2d6b5f',
};

function BarChart({ data }: { data: DayData[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 540, H = 150;
  const PAD_L = 28, PAD_B = 26, PAD_T = 16, PAD_R = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const gap = chartW / data.length;
  const barW = Math.max(2, gap - Math.max(1, gap * 0.25));
  const yTicks = max <= 2 ? [0, 1, max] : [0, Math.round(max / 2), max];
  const xLabelIndices = new Set<number>([0, data.length - 1]);
  if (data.length >= 14) for (let i = 7; i < data.length - 3; i += 7) xLabelIndices.add(i);
  else if (data.length >= 7) xLabelIndices.add(Math.floor(data.length / 2));

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
        {yTicks.map((t) => {
          const y = PAD_T + chartH - (t / max) * chartH;
          return (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth={1} strokeDasharray={t === 0 ? 'none' : '3 3'} />
              <text x={PAD_L - 5} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(0,0,0,0.32)">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = Math.max((d.count / max) * chartH, d.count > 0 ? 3 : 0);
          const x = PAD_L + i * gap + (gap - barW) / 2;
          const y = PAD_T + chartH - barH;
          const isHov = hovered === i;
          return (
            <g key={d.date} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
              <rect x={x} y={PAD_T} width={barW} height={chartH} fill="transparent" />
              {barH > 0 && <rect x={x} y={y} width={barW} height={barH} rx={Math.min(3, barW / 2)} fill={isHov ? '#2d6b5f' : 'rgba(45,107,95,0.5)'} style={{ transition: 'fill 0.1s' }} />}
              {isHov && (
                <>
                  <rect x={Math.max(PAD_L, Math.min(x + barW / 2 - 20, W - PAD_R - 42))} y={Math.max(2, y - 24)} width={40} height={18} rx={5} fill="#2d6b5f" />
                  <text x={Math.max(PAD_L + 20, Math.min(x + barW / 2, W - PAD_R - 22))} y={Math.max(14, y - 11)} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>{d.count}</text>
                </>
              )}
            </g>
          );
        })}
        {Array.from(xLabelIndices).map((i) => {
          const d = data[i];
          if (!d) return null;
          const x = PAD_L + i * gap + gap / 2;
          return <text key={i} x={Math.max(30, Math.min(x, W - 20))} y={H - 4} textAnchor="middle" fontSize={9} fill="rgba(0,0,0,0.38)">{new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</text>;
        })}
      </svg>
    </div>
  );
}

interface Props { onClose: () => void; }

export default function ViewStatsModal({ onClose }: Props) {
  const [period, setPeriod] = useState<Period>('days');
  const [view, setView] = useState<View>('stats');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const param = p === 'days' ? '?period=days&days=30' : `?period=${p}`;
      const res = await fetch(`/api/admin/view-stats${param}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setStats(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(period); }, [period, fetchStats]);

  const periodLabel = { days: '30 derniers jours', current_month: 'Mois en cours', last_month: 'Mois précédent' }[period];
  const maxSource = stats?.bySource.reduce((m, s) => Math.max(m, s.count), 1) ?? 1;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>Statistiques</h2>
            <p className={styles.subtitle}>/view · page vitrine</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* View toggle + Period tabs */}
        <div className={styles.topControls}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${view === 'stats' ? styles.viewBtnActive : ''}`} onClick={() => setView('stats')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>
              Données
            </button>
            <button className={`${styles.viewBtn} ${view === 'visitors' ? styles.viewBtnActive : ''}`} onClick={() => setView('visitors')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              Visiteurs {stats && <span className={styles.badge}>{stats.visitors.length}</span>}
            </button>
          </div>
          <div className={styles.tabs}>
            {(['days', 'current_month', 'last_month'] as Period[]).map((p) => (
              <button key={p} className={`${styles.tab} ${period === p ? styles.tabActive : ''}`} onClick={() => setPeriod(p)}>
                {{ days: '30j', current_month: 'Ce mois', last_month: 'Précédent' }[p]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}><div className={styles.spinner} />Chargement…</div>
        ) : error ? (
          <div className={styles.errorWrap}>Erreur : {error}</div>
        ) : stats ? (
          view === 'stats' ? (
            <div className={styles.content}>
              {/* KPIs */}
              <div className={styles.kpiRow}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiValue}>{stats.totalViews.toLocaleString('fr-FR')}</span>
                  <span className={styles.kpiLabel}>Vues totales</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiValue}>{stats.uniqueVisitors.toLocaleString('fr-FR')}</span>
                  <span className={styles.kpiLabel}>Visiteurs uniques</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiValue}>{stats.directVisits.toLocaleString('fr-FR')}</span>
                  <span className={styles.kpiLabel}>Accès directs</span>
                </div>
              </div>

              <div className={styles.divider} />

              {/* Chart */}
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Visites · <span className={styles.sectionPeriod}>{periodLabel}</span></p>
                {stats.totalViews === 0 ? <p className={styles.empty}>Aucune visite sur cette période</p> : <BarChart data={stats.dailyVisits} />}
              </div>

              {stats.bySource.length > 0 && <div className={styles.divider} />}

              {/* Sources */}
              {stats.bySource.length > 0 && (
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Sources de trafic</p>
                  <div className={styles.sourceList}>
                    {stats.bySource.map((s) => (
                      <div key={s.source} className={styles.sourceRow}>
                        <span className={styles.sourceName}>{s.source}</span>
                        <div className={styles.sourceBarWrap}>
                          <div className={styles.sourceBar} style={{ width: `${Math.round((s.count / maxSource) * 100)}%`, background: SOURCE_COLORS[s.source] ? `linear-gradient(90deg, ${SOURCE_COLORS[s.source]}cc, ${SOURCE_COLORS[s.source]}88)` : undefined }} />
                        </div>
                        <span className={styles.sourceCount}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Visitors tab */
            <div className={styles.content}>
              {stats.visitors.length === 0 ? (
                <p className={styles.empty}>Aucun visiteur sur cette période</p>
              ) : (
                <div className={styles.visitorList}>
                  <div className={styles.visitorHeader}>
                    <span>IP / Identifiant</span>
                    <span>Localisation</span>
                    <span>Source</span>
                    <span>Vues</span>
                    <span>Dernière visite</span>
                  </div>
                  {stats.visitors.map((v, i) => (
                    <div key={i} className={styles.visitorRow}>
                      <span className={styles.visitorIp}>
                        {v.ip ? v.ip : <span className={styles.ipHash} title={v.ip_hash}>{v.ip_hash.slice(0, 10)}…</span>}
                      </span>
                      <span className={styles.visitorLoc}>
                        {[v.city !== '—' ? v.city : null, v.country !== '—' ? v.country : null].filter(Boolean).join(', ') || '—'}
                      </span>
                      <span className={styles.visitorSource} style={{ color: SOURCE_COLORS[v.source] ?? 'inherit' }}>
                        {v.source}
                      </span>
                      <span className={styles.visitorVisits}>{v.visits}</span>
                      <span className={styles.visitorDate}>
                        {new Date(v.lastVisit).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
