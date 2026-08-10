"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Database,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminButton from '../AdminButton';
import { ADMIN_ENTRIES, findEntry } from '../AdminShell/registry';
import type { SitePageSummary } from '../../PageBuilder/pageTypes';
import styles from './AdminDashboard.module.css';

/** Pages câblées en dur dans `app/` — non supprimables depuis l'admin. */
const STATIC_PAGES: { slug: string; title: string }[] = [
  { slug: '/', title: 'Accueil' },
  { slug: '/realisation', title: 'Réalisation' },
  { slug: '/evenement', title: 'Évènement' },
  { slug: '/corporate', title: 'Corporate' },
  { slug: '/portrait', title: 'Portrait' },
  { slug: '/animation', title: 'Animation' },
  { slug: '/galeries', title: 'Galeries' },
  { slug: '/contact', title: 'Contact' },
];

/** Raccourcis les plus utilisés, en tête de tableau de bord. */
const QUICK_IDS = ['pages', 'style', 'layout', 'seo', 'stats', 'identity'];

type Health = 'checking' | 'ok' | 'down';

export default function AdminDashboard({ title }: { title: string }) {
  const [health, setHealth] = useState<Health>('checking');
  const [pages, setPages] = useState<SitePageSummary[] | null>(null);
  const [kpis, setKpis] = useState<{ visitors: number; views: number } | null>(null);
  const [openEntry, setOpenEntry] = useState<string | null>(null);

  const loadHealth = useCallback(() => {
    setHealth('checking');
    fetch('/api/admin/supabase-health')
      .then((r) => r.json())
      .then((j) => setHealth(j?.ok ? 'ok' : 'down'))
      .catch(() => setHealth('down'));
  }, []);

  useEffect(loadHealth, [loadHealth]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/pages')
      .then((r) => (r.ok ? r.json() : { pages: [] }))
      .then((j) => { if (mounted) setPages(Array.isArray(j?.pages) ? j.pages : []); })
      .catch(() => { if (mounted) setPages([]); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) return;
        const r = await fetch('/api/admin/analytics?days=7', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const j = await r.json();
        if (mounted && j?.kpis) {
          setKpis({
            visitors: j.kpis.uniqueVisitors ?? 0,
            views: j.kpis.totalViews ?? 0,
          });
        }
      } catch (_) {
        // Les statistiques ne sont pas critiques : le tableau de bord reste utile
      }
    })();
    return () => { mounted = false; };
  }, []);

  const quickEntries = QUICK_IDS.map(findEntry).filter(Boolean) as typeof ADMIN_ENTRIES;
  const entry = openEntry ? findEntry(openEntry) : null;

  return (
    <div className={styles.shell}>
      <div className="container">
        <div className={styles.inner}>
          <header className={styles.head}>
            <div className={styles.headText}>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.subtitle}>
                Vue d’ensemble du site. Le panneau latéral donne accès à tous les réglages.
              </p>
            </div>
            <AdminButton
              variant="secondary"
              size="sm"
              leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
              onClick={loadHealth}
            >
              Rafraîchir l’état
            </AdminButton>
          </header>

          {/* ── État ────────────────────────────────────────────────── */}
          <div className={styles.statusRow}>
            <StatusCard
              label="Base de données"
              value={
                health === 'checking' ? 'Vérification…'
                : health === 'ok' ? 'Connectée'
                : 'Indisponible'
              }
              tone={health === 'ok' ? 'ok' : health === 'down' ? 'bad' : 'neutral'}
              icon={health === 'down'
                ? <ShieldAlert size={18} aria-hidden="true" />
                : <ShieldCheck size={18} aria-hidden="true" />}
            />
            <StatusCard
              label="Pages dynamiques"
              value={pages === null ? '…' : String(pages.length)}
              tone="neutral"
              icon={<FileText size={18} aria-hidden="true" />}
            />
            <StatusCard
              label="Visiteurs (7 j)"
              value={kpis ? String(kpis.visitors) : '—'}
              tone="neutral"
              icon={<Activity size={18} aria-hidden="true" />}
            />
            <StatusCard
              label="Pages vues (7 j)"
              value={kpis ? String(kpis.views) : '—'}
              tone="neutral"
              icon={<Database size={18} aria-hidden="true" />}
            />
          </div>

          {/* ── Accès rapides ───────────────────────────────────────── */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Accès rapides</h2>
                <p className={styles.panelHint}>
                  Tous les réglages restent accessibles par ⌘K depuis n’importe quelle page.
                </p>
              </div>
            </div>
            <div className={styles.grid}>
              {quickEntries.map((e) => {
                const Icon = e.icon;
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={styles.tile}
                    onClick={() => setOpenEntry(e.id)}
                  >
                    <span className={styles.tileTop}>
                      <Icon size={17} className={styles.tileIcon} aria-hidden="true" />
                      <span className={styles.tileTitle}>{e.label}</span>
                    </span>
                    <span className={styles.tileDescription}>{e.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Pages ───────────────────────────────────────────────── */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Pages du site</h2>
                <p className={styles.panelHint}>
                  Les pages historiques sont câblées dans le code ; les pages créées depuis
                  l’admin sont modifiables et supprimables.
                </p>
              </div>
              <AdminButton
                variant="primary"
                size="sm"
                leadingIcon={<Plus size={14} aria-hidden="true" />}
                onClick={() => setOpenEntry('pages')}
              >
                Gérer les pages
              </AdminButton>
            </div>

            <div className={styles.grid}>
              {STATIC_PAGES.map((p) => (
                <Link key={p.slug} href={p.slug} className={styles.tile}>
                  <span className={styles.tileTop}>
                    <ExternalLink size={16} className={styles.tileIcon} aria-hidden="true" />
                    <span className={styles.tileTitle}>{p.title}</span>
                  </span>
                  <span className={styles.tileDescription}>{p.slug}</span>
                  <span className={styles.tileMeta}>
                    <span className={`${styles.badge} ${styles.badgeStatic}`}>Intégrée</span>
                  </span>
                </Link>
              ))}

              {(pages || []).map((p) => (
                <Link key={p.id} href={`/${p.slug}`} className={styles.tile}>
                  <span className={styles.tileTop}>
                    <Pencil size={16} className={styles.tileIcon} aria-hidden="true" />
                    <span className={styles.tileTitle}>{p.title}</span>
                  </span>
                  <span className={styles.tileDescription}>/{p.slug}</span>
                  <span className={styles.tileMeta}>
                    <span
                      className={`${styles.badge} ${
                        p.status === 'published' ? styles.badgePublished : styles.badgeDraft
                      }`}
                    >
                      {p.status === 'published' ? 'Publiée' : 'Brouillon'}
                    </span>
                    <span>{p.blockCount ?? 0} bloc{(p.blockCount ?? 0) > 1 ? 's' : ''}</span>
                  </span>
                </Link>
              ))}
            </div>

            {pages !== null && pages.length === 0 ? (
              <p className={styles.loading}>
                Aucune page créée depuis l’admin pour l’instant.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {entry ? entry.render({ close: () => setOpenEntry(null), open: setOpenEntry }) : null}
    </div>
  );
}

function StatusCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'bad' | 'warn' | 'neutral';
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === 'ok' ? styles.statusIconOk
    : tone === 'bad' ? styles.statusIconBad
    : tone === 'warn' ? styles.statusIconWarn
    : '';
  return (
    <div className={styles.statusCard}>
      <span className={`${styles.statusIcon} ${toneClass}`}>{icon}</span>
      <span className={styles.statusBody}>
        <span className={styles.statusLabel}>{label}</span>
        <span className={styles.statusValue}>{value}</span>
      </span>
    </div>
  );
}
