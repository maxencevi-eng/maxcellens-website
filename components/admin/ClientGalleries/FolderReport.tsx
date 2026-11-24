"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Download, Eye, EyeOff, FileSpreadsheet, Heart, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { AdminButton } from '..';
import type { AdminGallery, Folder } from '../../../lib/clientGalleries/types';
import { adminApi, copyTable, copyText, downloadTextFile } from './api';
import { fmtDate, folderChain, folderSubtree, galleryLink, statusLabel, statusOf } from './shared';
import s from './cg.module.css';

/** Même forme que la réponse de /api/admin/client-galleries/folders/report. */
type ReportRow = {
  total: number;
  downloaded: number;
  zipAll: boolean;
  photoDownloads: number;
  zipDownloads: number;
  hd: number;
  web: number;
  lastDownloadAt: string | null;
  favorites: number;
  visitors: { name: string | null; email: string | null }[];
  downloaders: number;
  reviewsSubmitted: number;
  reviewsUnseen: number;
  comments: number;
};

/** État d'une galerie dans le parcours du client. */
type State = 'unopened' | 'opened' | 'partial' | 'complete' | 'nodl' | 'draft';
type Filter = 'all' | State | 'expiring';
type SortKey = 'state' | 'title' | 'first' | 'last' | 'views' | 'downloads' | 'coverage' | 'expires';

const STATE_LABEL: Record<State, string> = {
  unopened: 'Jamais ouverte',
  opened: 'Ouverte, rien téléchargé',
  partial: 'En partie téléchargée',
  complete: 'Tout téléchargé',
  nodl: 'Consultée (sans téléchargement)',
  draft: 'Brouillon',
};
// Ordre du tri par défaut : ce qui demande une action d'abord
const STATE_ORDER: Record<State, number> = { unopened: 0, opened: 1, partial: 2, nodl: 3, complete: 4, draft: 5 };

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'unopened', label: 'Jamais ouvertes' },
  { key: 'opened', label: 'Ouvertes, rien téléchargé' },
  { key: 'partial', label: 'En partie téléchargées' },
  { key: 'complete', label: 'Tout téléchargé' },
  { key: 'nodl', label: 'Téléchargement désactivé' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'expiring', label: 'Expirées / bientôt' },
];

const EMPTY: ReportRow = {
  total: 0,
  downloaded: 0,
  zipAll: false,
  photoDownloads: 0,
  zipDownloads: 0,
  hd: 0,
  web: 0,
  lastDownloadAt: null,
  favorites: 0,
  visitors: [],
  downloaders: 0,
  reviewsSubmitted: 0,
  reviewsUnseen: 0,
  comments: 0,
};

function stateOf(g: AdminGallery, r: ReportRow): State {
  if (g.status === 'draft') return 'draft';
  if (!g.first_viewed_at) return 'unopened';
  if (r.zipAll || (r.total > 0 && r.downloaded >= r.total)) return 'complete';
  if (r.downloaded > 0 || r.photoDownloads + r.zipDownloads > 0) return 'partial';
  return g.download.enabled ? 'opened' : 'nodl';
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export default function FolderReport({
  folder,
  folders,
  galleries,
  onOpenGallery,
  toast,
}: {
  folder: Folder;
  folders: Folder[];
  galleries: AdminGallery[];
  onOpenGallery: (id: string, target?: { tab?: string; share?: boolean }) => void;
  toast: (m: string) => void;
}) {
  const hasSub = useMemo(() => folders.some((f) => f.parent_id === folder.id), [folders, folder.id]);
  const [withSub, setWithSub] = useState(true);
  const [rows, setRows] = useState<Record<string, ReportRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'state', desc: false });
  const [sel, setSel] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ folder: folder.id, sub: withSub ? '1' : '0' });
      const j = await adminApi<{ rows: Record<string, ReportRow> }>(`/folders/report?${qs}`);
      setRows(j.rows);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [folder.id, withSub]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setSel(new Set()), [filter, withSub, folder.id]);

  // Galeries du bilan (même périmètre que la route)
  const items = useMemo(() => {
    const tree = withSub ? folderSubtree(folders, folder.id) : new Set([folder.id]);
    return galleries
      .filter((g) => !g.deleted_at && g.folder_id && tree.has(g.folder_id))
      .map((g) => {
        const r = rows?.[g.id] || EMPTY;
        const st = statusOf(g);
        // Chemin du sous-dossier, relatif au dossier ouvert
        const chain = folderChain(folders, g.folder_id);
        const at = chain.findIndex((f) => f.id === folder.id);
        const sub = chain
          .slice(at + 1)
          .map((f) => f.name)
          .join(' / ');
        return { g, r, state: stateOf(g, r), expiring: st === 'expired' || st === 'expiring', sub };
      });
  }, [galleries, folders, folder.id, withSub, rows]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, unopened: 0, opened: 0, partial: 0, complete: 0, nodl: 0, draft: 0, expiring: 0 };
    for (const it of items) {
      c[it.state]++;
      if (it.expiring) c.expiring++;
    }
    return c;
  }, [items]);

  const published = items.length - counts.draft;
  const opened = published - counts.unopened;
  const downloadable = items.filter((it) => it.state !== 'draft' && it.g.download.enabled).length;
  const downloadedAny = counts.partial + counts.complete;

  const list = useMemo(() => {
    const l = items.filter((it) => (filter === 'all' ? true : filter === 'expiring' ? it.expiring : it.state === filter));
    const val = (it: (typeof items)[number]): number | string => {
      switch (sort.key) {
        case 'title':
          return it.g.title;
        case 'first':
          return it.g.first_viewed_at || '';
        case 'last':
          return it.g.last_viewed_at || '';
        case 'views':
          return it.g.view_count;
        case 'downloads':
          return it.r.photoDownloads + it.r.zipDownloads;
        case 'coverage':
          return it.r.total ? it.r.downloaded / it.r.total : -1;
        case 'expires':
          return it.g.expires_at || '9999';
        default:
          return STATE_ORDER[it.state];
      }
    };
    return [...l].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr', { numeric: true });
      return (sort.desc ? -c : c) || a.g.title.localeCompare(b.g.title, 'fr', { numeric: true });
    });
  }, [items, filter, sort]);

  const target = sel.size ? list.filter((it) => sel.has(it.g.id)) : list;

  const sortBy = (key: SortKey) =>
    setSort((cur) => (cur.key === key ? { key, desc: !cur.desc } : { key, desc: ['views', 'downloads', 'coverage', 'last', 'first'].includes(key) }));
  const th = (key: SortKey, label: string) => (
    <th data-sort onClick={() => sortBy(key)} aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
      {label}
      {sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
    </th>
  );

  const toggle = (id: string) =>
    setSel((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = list.length > 0 && list.every((it) => sel.has(it.g.id));

  /* ── Actions ── */
  const copyForFollowUp = async () => {
    const ok = await copyTable(
      ['Galerie', 'Client', 'E-mail', 'Lien', 'Mot de passe', 'État'],
      target.map((it) => [
        it.g.title,
        it.g.client_name,
        it.g.client_email,
        it.g.magic_token ? galleryLink(it.g, true) : galleryLink(it.g),
        it.g.access_mode === 'password' && !it.g.magic_token ? it.g.password : '',
        STATE_LABEL[it.state],
      ])
    );
    toast(ok ? `${target.length} galerie${target.length > 1 ? 's' : ''} copiée${target.length > 1 ? 's' : ''} (collable dans un tableur ou un e-mail)` : 'Copie impossible');
  };
  const copyEmails = async () => {
    const emails = Array.from(new Set(target.map((it) => it.g.client_email?.trim()).filter(Boolean) as string[]));
    if (!emails.length) return toast('Aucun e-mail client renseigné');
    const ok = await copyText(emails.join(', '));
    toast(ok ? `${emails.length} e-mail${emails.length > 1 ? 's' : ''} copié${emails.length > 1 ? 's' : ''}` : 'Copie impossible');
  };
  const exportCsv = () => {
    const esc = (v: any) => {
      const t = v == null ? '' : String(v);
      return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const head = [
      'Galerie', 'Sous-dossier', 'Client', 'E-mail', 'État', 'Statut', 'Première visite', 'Dernière visite', 'Visites',
      'Téléchargements unitaires', 'ZIP', 'HD', 'Web', 'Éléments téléchargés', 'Éléments', 'Dernier téléchargement',
      'Favoris', 'Visiteurs identifiés', 'Reviews terminées', 'Commentaires', 'Expiration', 'Lien',
    ];
    const body = target.map((it) => [
      it.g.title,
      it.sub,
      it.g.client_name,
      it.g.client_email,
      STATE_LABEL[it.state],
      statusLabel(it.g),
      it.g.first_viewed_at ? fmtDate(it.g.first_viewed_at, true) : 'Jamais',
      it.g.last_viewed_at ? fmtDate(it.g.last_viewed_at, true) : '',
      it.g.view_count,
      it.r.photoDownloads,
      it.r.zipDownloads,
      it.r.hd,
      it.r.web,
      it.r.zipAll ? it.r.total : it.r.downloaded,
      it.r.total,
      it.r.lastDownloadAt ? fmtDate(it.r.lastDownloadAt, true) : '',
      it.r.favorites,
      it.r.visitors.map((v) => v.name || v.email).join(', '),
      it.r.reviewsSubmitted,
      it.r.comments,
      it.g.expires_at ? fmtDate(it.g.expires_at) : '',
      galleryLink(it.g),
    ]);
    const slug = folder.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    downloadTextFile(`bilan-${slug || 'dossier'}-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [head, ...body].map((r) => r.map(esc).join(';')).join('\r\n'));
  };

  const openRow = (it: (typeof items)[number]) => {
    if (it.state === 'unopened') onOpenGallery(it.g.id, { share: true });
    else if (it.r.reviewsUnseen) onOpenGallery(it.g.id, { tab: 'reviews' });
    else onOpenGallery(it.g.id, { tab: 'activity' });
  };

  const kpis = [
    { label: 'Galeries', value: items.length, sub: counts.draft ? `${counts.draft} brouillon${counts.draft > 1 ? 's' : ''}` : `${published} publiée${published > 1 ? 's' : ''}`, icon: null as React.ReactNode },
    { label: 'Ouvertes', value: opened, sub: `${pct(opened, published)} % des publiées`, icon: <Eye size={16} /> },
    { label: 'Téléchargées', value: downloadedAny, sub: `${pct(downloadedAny, downloadable)} % des téléchargeables`, icon: <Download size={16} /> },
    { label: 'Tout téléchargé', value: counts.complete, sub: `${pct(counts.complete, downloadable)} %`, icon: <CheckCircle2 size={16} />, ok: true },
    { label: 'Ouvertes, rien téléchargé', value: counts.opened, icon: <Download size={16} />, warn: counts.opened > 0 },
    { label: 'Jamais ouvertes', value: counts.unopened, sub: 'à relancer', icon: <EyeOff size={16} />, warn: counts.unopened > 0 },
  ];

  return (
    <div>
      <div className={s.filters}>
        <div className={s.stateChips} role="group" aria-label="Filtrer par état">
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0 || f.key === filter).map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} data-st={f.key} onClick={() => setFilter(f.key)}>
              {f.label} <span>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <span className={s.spacer} />
        {hasSub ? (
          <label className={s.muted} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={withSub} onChange={(e) => setWithSub(e.target.checked)} style={{ accentColor: 'var(--adm-accent)' }} />
            Inclure les sous-dossiers
          </label>
        ) : null}
        <AdminButton size="sm" variant="ghost" leadingIcon={<RefreshCw size={14} />} onClick={load} loading={loading}>
          Actualiser
        </AdminButton>
      </div>

      {error ? <div className={`${s.notice} ${s.noticeErr}`}>{error}</div> : null}

      <div className={s.kpis}>
        {kpis.map((k) => (
          <div key={k.label} className={s.kpi}>
            {k.icon ? <span className={s.kpiIcon}>{k.icon}</span> : null}
            <b style={{ color: k.warn ? 'var(--adm-warning)' : k.ok && k.value ? 'var(--adm-success)' : undefined }}>{rows ? k.value : '…'}</b>
            <span>
              {k.label}
              {k.sub ? ` · ${k.sub}` : ''}
            </span>
          </div>
        ))}
      </div>

      <div className={s.filters}>
        <span className={s.muted}>
          {sel.size ? `${sel.size} sélectionnée${sel.size > 1 ? 's' : ''}` : `${list.length} galerie${list.length > 1 ? 's' : ''}`}
        </span>
        <span className={s.spacer} />
        <AdminButton size="sm" variant="ghost" leadingIcon={<Copy size={14} />} onClick={copyForFollowUp} disabled={!target.length} title="Galerie, client, e-mail, lien (magique si possible) et mot de passe : à coller dans un tableur ou un e-mail">
          Copier pour relance
        </AdminButton>
        <AdminButton size="sm" variant="ghost" leadingIcon={<Mail size={14} />} onClick={copyEmails} disabled={!target.length}>
          Copier les e-mails
        </AdminButton>
        <AdminButton size="sm" variant="secondary" leadingIcon={<FileSpreadsheet size={15} />} onClick={exportCsv} disabled={!target.length}>
          Exporter le bilan{sel.size ? ` (${sel.size})` : ''}
        </AdminButton>
      </div>

      {!rows && !error ? (
        <div className={s.empty}>Calcul du bilan…</div>
      ) : !items.length ? (
        <div className={s.empty}>
          <h3>Aucune galerie dans ce dossier</h3>
        </div>
      ) : !list.length ? (
        <div className={s.empty}>
          <h3>Aucune galerie dans cet état</h3>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={allSelected}
                    onChange={() => setSel(allSelected ? new Set() : new Set(list.map((it) => it.g.id)))}
                    style={{ accentColor: 'var(--adm-accent)' }}
                  />
                </th>
                {th('title', 'Galerie')}
                {th('state', 'État')}
                {th('first', '1re visite')}
                {th('last', 'Dernière visite')}
                {th('views', 'Visites')}
                {th('downloads', 'Téléchargements')}
                {th('coverage', 'Éléments téléchargés')}
                <th>Favoris · reviews</th>
                <th>Visiteurs</th>
                {th('expires', 'Expire')}
              </tr>
            </thead>
            <tbody>
              {list.map((it) => {
                const { g, r } = it;
                const done = r.zipAll ? r.total : r.downloaded;
                const dl = r.photoDownloads + r.zipDownloads;
                const st = statusOf(g);
                return (
                  <tr key={g.id} data-selected={sel.has(g.id)} onClick={() => openRow(it)} title={it.state === 'unopened' ? 'Ouvrir le partage pour relancer le client' : 'Ouvrir l’activité de la galerie'}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Sélectionner ${g.title}`} checked={sel.has(g.id)} onChange={() => toggle(g.id)} style={{ accentColor: 'var(--adm-accent)' }} />
                    </td>
                    <td>
                      <div className={s.tTitle} style={{ maxWidth: 280 }}>
                        <div>
                          <span title={g.title}>{g.title}</span>
                          {it.sub || g.client_name || g.client_email ? <small>{[it.sub, g.client_name || g.client_email].filter(Boolean).join(' · ')}</small> : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={s.statePill} data-st={it.state}>
                        {STATE_LABEL[it.state]}
                      </span>
                    </td>
                    <td className={s.muted}>{g.first_viewed_at ? fmtDate(g.first_viewed_at, true) : '—'}</td>
                    <td className={s.muted}>{g.last_viewed_at ? fmtDate(g.last_viewed_at, true) : '—'}</td>
                    <td>{g.view_count || <span className={s.muted}>0</span>}</td>
                    <td>
                      {!g.download.enabled && !dl ? (
                        <span className={s.muted}>Désactivé</span>
                      ) : dl ? (
                        <span title={r.lastDownloadAt ? `Dernier : ${fmtDate(r.lastDownloadAt, true)}` : undefined}>
                          {dl}
                          <small className={s.muted}>
                            {' · '}
                            {[r.zipDownloads ? `${r.zipDownloads} ZIP` : null, r.hd ? `${r.hd} HD` : null, r.web ? `${r.web} web` : null].filter(Boolean).join(' · ')}
                          </small>
                        </span>
                      ) : (
                        <span className={s.muted}>0</span>
                      )}
                    </td>
                    <td>
                      {r.total ? (
                        <div className={s.coverage} title={`${pct(done, r.total)} %`}>
                          <span>
                            {done}/{r.total}
                          </span>
                          <i>
                            <b style={{ width: `${pct(done, r.total)}%` }} data-full={done >= r.total} />
                          </i>
                        </div>
                      ) : (
                        <span className={s.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {r.favorites || r.reviewsSubmitted || r.comments ? (
                        <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                          {r.favorites ? (
                            <span title="Photos en favori" style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                              <Heart size={13} /> {r.favorites}
                            </span>
                          ) : null}
                          {r.reviewsSubmitted || r.comments ? (
                            <span title={`${r.reviewsSubmitted} review(s) terminée(s), ${r.comments} commentaire(s)`} style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                              <MessageSquare size={13} /> {r.comments}
                              {r.reviewsUnseen ? <span className={s.reviewNew}>{r.reviewsUnseen} nouvelle{r.reviewsUnseen > 1 ? 's' : ''}</span> : null}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className={s.muted}>—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.visitors.length ? (
                        <span title={r.visitors.map((v) => [v.name, v.email].filter(Boolean).join(' — ')).join('\n')}>
                          {r.visitors
                            .slice(0, 2)
                            .map((v) => v.name || v.email)
                            .join(', ')}
                          {r.visitors.length > 2 ? <span className={s.muted}> +{r.visitors.length - 2}</span> : null}
                        </span>
                      ) : (
                        <span className={s.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {g.expires_at ? (
                        st === 'expired' || st === 'expiring' ? (
                          <span className={s.pill} data-s={st}>
                            {statusLabel(g)}
                          </span>
                        ) : (
                          <span className={s.muted}>{fmtDate(g.expires_at)}</span>
                        )
                      ) : (
                        <span className={s.muted}>Jamais</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className={s.muted} style={{ marginTop: 10 }}>
        Sur toute la durée de vie des galeries. Les aperçus faits depuis l’administration ne sont pas comptés. « Éléments téléchargés » compte chaque photo ou vidéo récupérée au moins une fois, à l’unité ou dans un ZIP. Seuls les téléchargements faits depuis la galerie elle-même comptent : un téléchargement global depuis le lien du dossier partagé n’est pas pris en compte (il reste visible dans l’Activité).
      </p>
    </div>
  );
}
