"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Heart, KeyRound, RefreshCw, ShieldAlert, Unlock } from 'lucide-react';
import { AdminButton } from '..';
import type { AdminGallery, Folder } from '../../../lib/clientGalleries/types';
import { adminApi, downloadTextFile } from './api';
import { fmtDate, folderPath } from './shared';
import s from './cg.module.css';

type Ev = {
  id: number;
  gallery_id: string;
  type: string;
  photo_id: string | null;
  meta: any;
  created_at: string;
  filename: string | null;
  visitor: { name: string | null; email: string } | null;
};

type Data = {
  days: number;
  counts: Record<string, number>;
  events: Ev[];
  top: { id: string; views: number; downloads: number; favorites: number }[];
  neverOpened: { id: string; title: string; folder_id: string | null; published_at: string | null; client_name: string | null; client_email: string | null }[];
  truncated: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  view: 'Visite',
  unlock: 'Accès ouvert',
  unlock_fail: 'Mot de passe erroné',
  download_photo: 'Téléchargement',
  download_zip: 'Téléchargement ZIP',
  favorite: 'Favori',
};
const TYPE_ICON: Record<string, React.ReactNode> = {
  view: <Eye size={14} />,
  unlock: <Unlock size={14} />,
  unlock_fail: <ShieldAlert size={14} />,
  download_photo: <Download size={14} />,
  download_zip: <Download size={14} />,
  favorite: <Heart size={14} />,
};

function detail(e: Ev) {
  const m = e.meta || {};
  const bits: string[] = [];
  if (e.filename) bits.push(e.filename);
  if (e.type === 'download_zip') {
    bits.push(`${m.count ?? '?'} fichier${(m.count ?? 0) > 1 ? 's' : ''}`);
    if (m.scope === 'set') bits.push('une section');
    if (m.scope === 'favorites') bits.push('favoris');
  }
  if (m.size) bits.push(m.size === 'original' ? 'HD' : 'web');
  if (m.via === 'magic') bits.push('lien magique');
  return bits.join(' · ');
}

export default function ActivityOverview({
  galleries,
  folders,
  onOpenGallery,
}: {
  galleries: AdminGallery[];
  folders: Folder[];
  onOpenGallery: (id: string) => void;
}) {
  const [days, setDays] = useState(30);
  const [type, setType] = useState('');
  const [gallery, setGallery] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const byId = useMemo(() => new Map(galleries.map((g) => [g.id, g])), [galleries]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days), type, gallery, limit: '400' });
      setData(await adminApi<Data>(`/activity?${qs}`));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [days, type, gallery]);

  useEffect(() => {
    load();
  }, [load]);

  const c = data?.counts || {};
  const kpis = [
    { label: 'Visites', value: c.view || 0, icon: <Eye size={16} /> },
    { label: 'Accès ouverts', value: c.unlock || 0, icon: <Unlock size={16} /> },
    { label: 'Téléchargements', value: (c.download_photo || 0) + (c.download_zip || 0), icon: <Download size={16} />, sub: `${c.download_zip || 0} ZIP` },
    { label: 'Favoris', value: c.favorite || 0, icon: <Heart size={16} /> },
    { label: 'Mots de passe erronés', value: c.unlock_fail || 0, icon: <KeyRound size={16} />, warn: (c.unlock_fail || 0) > 0 },
  ];

  const galleryName = (id: string) => byId.get(id)?.title || 'Galerie supprimée';
  const galleryFolder = (id: string) => {
    const f = byId.get(id)?.folder_id;
    return f ? folderPath(folders, f) : '';
  };

  const exportCsv = () => {
    if (!data) return;
    const esc = (v: any) => {
      const t = v == null ? '' : String(v);
      return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const rows = [
      ['Date', 'Galerie', 'Dossier', 'Action', 'Détail', 'Visiteur', 'E-mail'],
      ...data.events.map((e) => [
        new Date(e.created_at).toLocaleString('fr-FR'),
        galleryName(e.gallery_id),
        galleryFolder(e.gallery_id),
        TYPE_LABEL[e.type] || e.type,
        detail(e),
        e.visitor?.name || '',
        e.visitor?.email || '',
      ]),
    ];
    downloadTextFile(`activite-galeries-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n'));
  };

  return (
    <div>
      <div className={s.top}>
        <h1 className={s.h1}>Activité</h1>
        <span className={s.spacer} />
        <div className={s.toolbar}>
          <AdminButton size="sm" variant="ghost" leadingIcon={<RefreshCw size={14} />} onClick={load} loading={loading}>
            Actualiser
          </AdminButton>
          <AdminButton size="sm" variant="secondary" leadingIcon={<FileSpreadsheet size={15} />} onClick={exportCsv} disabled={!data?.events.length}>
            Exporter le journal
          </AdminButton>
        </div>
      </div>

      <div className={s.filters}>
        <div className={s.seg}>
          {[
            [7, '7 jours'],
            [30, '30 jours'],
            [90, '3 mois'],
            [0, 'Tout'],
          ].map(([d, l]) => (
            <button key={d} aria-pressed={days === d} onClick={() => setDays(d as number)} style={{ padding: '5px 12px', fontSize: 13 }}>
              {l}
            </button>
          ))}
        </div>
        <select className={s.select} value={type} onChange={(e) => setType(e.target.value)} aria-label="Type d’action">
          <option value="">Toutes les actions</option>
          <option value="download">Téléchargements</option>
          <option value="view">Visites</option>
          <option value="favorite">Favoris</option>
          <option value="access">Accès (mot de passe)</option>
        </select>
        <select className={s.select} value={gallery} onChange={(e) => setGallery(e.target.value)} aria-label="Galerie" style={{ maxWidth: 280 }}>
          <option value="">Toutes les galeries</option>
          {[...galleries]
            .filter((g) => !g.deleted_at)
            .sort((a, b) => a.title.localeCompare(b.title, 'fr', { numeric: true }))
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
        </select>
      </div>

      {error ? <div className={`${s.notice} ${s.noticeErr}`}>{error}</div> : null}

      <div className={s.kpis}>
        {kpis.map((k) => (
          <div key={k.label} className={s.kpi}>
            <span className={s.kpiIcon}>{k.icon}</span>
            <b style={{ color: k.warn ? 'var(--adm-warning)' : undefined }}>{data ? k.value : '…'}</b>
            <span>
              {k.label}
              {k.sub ? ` · ${k.sub}` : ''}
            </span>
          </div>
        ))}
      </div>

      <div className={s.activityCols}>
        <div className={s.card2} style={{ padding: 0, overflow: 'hidden' }}>
          <div className={s.activityHead}>
            Journal
            {data?.truncated ? <span className={s.muted}> · {data.events.length} derniers évènements</span> : null}
          </div>
          {data && !data.events.length ? <p className={s.muted} style={{ padding: '0 18px 18px' }}>Aucune activité sur cette période.</p> : null}
          {data?.events.length ? (
            <div className={s.tableWrap} style={{ border: 0, borderRadius: 0 }}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Galerie</th>
                    <th>Action</th>
                    <th>Détail</th>
                    <th>Visiteur</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((e) => (
                    <tr key={e.id} onClick={() => byId.has(e.gallery_id) && onOpenGallery(e.gallery_id)}>
                      <td className={s.muted}>{fmtDate(e.created_at, true)}</td>
                      <td>
                        <div className={s.tTitle} style={{ maxWidth: 260 }}>
                          <div>
                            <span>{galleryName(e.gallery_id)}</span>
                            {galleryFolder(e.gallery_id) ? <small>{galleryFolder(e.gallery_id)}</small> : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={s.evType} data-type={e.type}>
                          {TYPE_ICON[e.type]} {TYPE_LABEL[e.type] || e.type}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 260 }}>{detail(e) || <span className={s.muted}>—</span>}</td>
                      <td>{e.visitor ? <span title={e.visitor.email}>{e.visitor.name || e.visitor.email}</span> : <span className={s.muted}>Anonyme</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div>
          <div className={s.card2}>
            <h3>Galeries les plus actives</h3>
            {data?.top.length ? (
              <ul className={s.log} style={{ marginTop: 8 }}>
                {data.top.map((t) => (
                  <li key={t.id} style={{ cursor: byId.has(t.id) ? 'pointer' : 'default' }} onClick={() => byId.has(t.id) && onOpenGallery(t.id)}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{galleryName(t.id)}</span>
                    <span className={s.muted} style={{ whiteSpace: 'nowrap' }}>
                      {t.downloads} ⬇ · {t.views} vues{t.favorites ? ` · ${t.favorites} ♥` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Pas encore d’activité.</p>
            )}
          </div>
          <div className={s.card2}>
            <h3>Publiées, jamais ouvertes ({data?.neverOpened.length ?? '…'})</h3>
            <p>À relancer : le client n’a pas encore ouvert sa galerie.</p>
            {data?.neverOpened.length ? (
              <ul className={s.log} style={{ marginTop: 8 }}>
                {data.neverOpened.map((g) => (
                  <li key={g.id} style={{ cursor: 'pointer' }} onClick={() => onOpenGallery(g.id)}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</b>
                      <small className={s.muted}>{[g.client_name, g.client_email, g.folder_id ? folderPath(folders, g.folder_id) : null].filter(Boolean).join(' · ')}</small>
                    </span>
                    <span className={s.muted} style={{ whiteSpace: 'nowrap' }}>
                      {g.published_at ? `publiée le ${fmtDate(g.published_at)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : data ? (
              <p className={s.ok}>Toutes les galeries publiées ont été ouvertes.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
