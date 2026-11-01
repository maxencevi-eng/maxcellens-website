"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CloudOff,
  Copy,
  Download,
  DownloadCloud,
  Droplets,
  FileSpreadsheet,
  Folder as FolderIcon,
  FolderPlus,
  Globe,
  ImageOff,
  KeyRound,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Tag,
  Trash2,
  Users,
  X,
  CalendarClock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AdminButton, AdminModal, SelectField, confirmDialog, promptDialog } from '..';
import {
  formatBytes,
  R2_FREE_BYTES,
  type AdminGallery,
  type Folder,
  type Template,
  type Watermark,
} from '../../../lib/clientGalleries/types';
import { adminApi, copyText, downloadTextFile } from './api';
import { NewGalleryDialog, SessionDialog } from './CreateDialogs';
import { TemplatesManager, WatermarksManager } from './Managers';
import { ACCESS_LABEL, fmtDate, FolderSelect, galleriesCsv, ShareDialog, statusLabel, statusOf, useToast, WatermarkSelect } from './shared';
import s from './cg.module.css';

type Data = {
  galleries: AdminGallery[];
  folders: Folder[];
  templates: Template[];
  watermarks: Watermark[];
  config: { r2: boolean; secret: boolean };
};

type View = 'all' | 'draft' | 'published' | 'expiring' | 'trash' | 'templates' | 'watermarks' | `folder:${string}`;
type SortKey = 'created' | 'event' | 'title' | 'views' | 'size';

/* ── Jauge d'espace ── */
export function StorageMeter({ used, live }: { used: number; live?: boolean }) {
  const pct = Math.min(100, (used / R2_FREE_BYTES) * 100);
  const level = used > R2_FREE_BYTES ? 'over' : pct > 80 ? 'warn' : 'ok';
  const over = Math.max(0, used - R2_FREE_BYTES);
  const cost = (over / 1e9) * 0.015;
  return (
    <div className={s.meter}>
      <div className={s.meterHead}>
        <span>Espace utilisé</span>
        {live ? <span className={s.live}>direct</span> : null}
      </div>
      <div className={s.meterHead} style={{ marginTop: 4 }}>
        <b>{formatBytes(used)}</b>
        <span className={s.muted}>/ 10 Go gratuits</span>
      </div>
      <div className={s.meterBar}>
        <i style={{ width: `${Math.max(1.5, pct)}%` }} data-level={level} />
      </div>
      <div className={s.meterNote}>
        {over > 0
          ? `Au-delà de l’offre gratuite : ~${cost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $/mois.`
          : `${formatBytes(R2_FREE_BYTES - used)} disponibles dans l’offre gratuite R2. Téléchargements clients illimités et gratuits.`}
      </div>
    </div>
  );
}

/* ── Choix pour actions groupées ── */
function ChoiceDialog({
  title,
  children,
  onClose,
  onApply,
  applyLabel = 'Appliquer',
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onApply: () => Promise<void> | void;
  applyLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AdminModal
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Annuler
          </AdminButton>
          <AdminButton
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onApply();
              setBusy(false);
            }}
          >
            {applyLabel}
          </AdminButton>
        </>
      }
    >
      <div className={s.stack} style={{ marginTop: 0 }}>
        {children}
      </div>
    </AdminModal>
  );
}

export default function GalleriesAdmin() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<{ msg: string; setup?: boolean } | null>(null);
  const [view, setView] = useState<View>((params.get('v') as View) || 'all');
  const [q, setQ] = useState('');
  const [access, setAccess] = useState('');
  const [sort, setSort] = useState<SortKey>('created');
  const [layout, setLayout] = useState<'grid' | 'table'>('grid');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | { kind: string; gallery?: AdminGallery }>(null);
  const [choice, setChoice] = useState<any>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const j = await adminApi<Data>('');
      setData(j);
      setError(null);
    } catch (e: any) {
      setError({ msg: e.message, setup: e.setup });
    }
  }, []);

  useEffect(() => {
    load();
    try {
      const l = localStorage.getItem('cg_layout');
      if (l === 'table' || l === 'grid') setLayout(l);
    } catch {}
  }, [load]);

  // Rafraîchissement « en direct » : au retour sur l'onglet et toutes les 30 s
  useEffect(() => {
    const onFocus = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onFocus);
    const t = window.setInterval(onFocus, 30000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.clearInterval(t);
    };
  }, [load]);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (view === 'all') u.searchParams.delete('v');
    else u.searchParams.set('v', view);
    window.history.replaceState(null, '', u.toString());
    setSel(new Set());
  }, [view]);

  const galleries = data?.galleries || [];
  const folders = data?.folders || [];
  const usedBytes = useMemo(() => galleries.reduce((a, g) => a + (g.stored_bytes || g.bytes_total || 0), 0), [galleries]);

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, published: 0, expiring: 0, trash: 0 };
    const byFolder: Record<string, number> = {};
    for (const g of galleries) {
      const st = statusOf(g);
      if (st === 'trash') {
        c.trash++;
        continue;
      }
      c.all++;
      if (g.status === 'draft') c.draft++;
      if (g.status === 'published') c.published++;
      if (st === 'expiring' || st === 'expired') c.expiring++;
      if (g.folder_id) byFolder[g.folder_id] = (byFolder[g.folder_id] || 0) + 1;
    }
    return { ...c, byFolder };
  }, [galleries]);

  const list = useMemo(() => {
    const needle = q
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    let l = galleries.filter((g) => {
      const st = statusOf(g);
      if (view === 'trash') return st === 'trash';
      if (st === 'trash') return false;
      if (view === 'draft') return g.status === 'draft';
      if (view === 'published') return g.status === 'published';
      if (view === 'expiring') return st === 'expiring' || st === 'expired';
      if (view.startsWith('folder:')) return g.folder_id === view.slice(7);
      return true;
    });
    if (access) l = l.filter((g) => g.access_mode === access);
    if (needle) {
      l = l.filter((g) =>
        [g.title, g.client_name, g.client_email, g.slug, ...(g.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .includes(needle)
      );
    }
    const cmp: Record<SortKey, (a: AdminGallery, b: AdminGallery) => number> = {
      created: (a, b) => b.created_at.localeCompare(a.created_at),
      event: (a, b) => (b.event_date || '').localeCompare(a.event_date || ''),
      title: (a, b) => a.title.localeCompare(b.title, 'fr', { numeric: true }),
      views: (a, b) => b.view_count - a.view_count,
      size: (a, b) => b.stored_bytes - a.stored_bytes,
    };
    return [...l].sort(cmp[sort]);
  }, [galleries, view, q, access, sort]);

  const selected = list.filter((g) => sel.has(g.id));
  const currentFolder = view.startsWith('folder:') ? folders.find((f) => f.id === view.slice(7)) : null;

  const replace = (updated: AdminGallery[]) =>
    setData((d) => (d ? { ...d, galleries: d.galleries.map((g) => updated.find((u) => u.id === g.id) || g) } : d));

  const toggle = (id: string, e?: React.MouseEvent) => {
    setSel((cur) => {
      const next = new Set(cur);
      if (e?.shiftKey && lastClicked) {
        const ids = list.map((g) => g.id);
        const [a, b] = [ids.indexOf(lastClicked), ids.indexOf(id)].sort((x, y) => x - y);
        if (a >= 0 && b >= 0) ids.slice(a, b + 1).forEach((x) => next.add(x));
      } else next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setLastClicked(id);
  };

  const bulk = async (patch: any, msg: string) => {
    const ids = Array.from(sel);
    try {
      const j = await adminApi<{ galleries: AdminGallery[] }>('/bulk', { method: 'POST', json: { ids, action: 'patch', patch } });
      replace(j.galleries);
      toast.show(msg.replace('{n}', String(j.galleries.length)));
      setChoice(null);
      if ('deleted' in patch) setSel(new Set());
    } catch (e: any) {
      toast.show(e.message);
    }
  };

  const destroy = async (ids: string[]) => {
    const n = ids.length;
    const typed = await promptDialog({
      title: `Supprimer définitivement ${n} galerie${n > 1 ? 's' : ''} ?`,
      message: 'Fichiers et statistiques seront effacés. Tapez SUPPRIMER pour confirmer.',
      placeholder: 'SUPPRIMER',
      confirmLabel: 'Supprimer définitivement',
      tone: 'danger',
    });
    if (typed?.trim().toUpperCase() !== 'SUPPRIMER') return;
    await adminApi('/bulk', { method: 'POST', json: { ids, action: 'destroy' } });
    setData((d) => (d ? { ...d, galleries: d.galleries.filter((g) => !ids.includes(g.id)) } : d));
    setSel(new Set());
    toast.show('Supprimées définitivement');
  };

  const exportCsv = (rows: AdminGallery[]) => {
    const name = currentFolder ? currentFolder.name : view === 'all' ? 'toutes' : view;
    downloadTextFile(`galeries-${name.replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`, galleriesCsv(rows, folders));
    toast.show(`Export : ${rows.length} galerie${rows.length > 1 ? 's' : ''}`);
  };

  const newFolder = async () => {
    const name = await promptDialog({ title: 'Nouveau dossier', label: 'Nom', placeholder: 'BNP Paribas' });
    if (!name?.trim()) return;
    const j = await adminApi<{ folder: Folder }>('/folders', { method: 'POST', json: { name } });
    setData((d) => (d ? { ...d, folders: [j.folder, ...d.folders] } : d));
    setView(`folder:${j.folder.id}`);
  };
  const renameFolder = async (f: Folder) => {
    const name = await promptDialog({ title: 'Renommer le dossier', defaultValue: f.name });
    if (!name?.trim()) return;
    const j = await adminApi<{ folder: Folder }>('/folders', { method: 'PATCH', json: { id: f.id, name } });
    setData((d) => (d ? { ...d, folders: d.folders.map((x) => (x.id === f.id ? j.folder : x)) } : d));
  };
  const deleteFolder = async (f: Folder) => {
    if (!(await confirmDialog({ title: `Supprimer le dossier « ${f.name} » ?`, message: 'Les galeries qu’il contient sont conservées, sans dossier.', tone: 'danger', confirmLabel: 'Supprimer le dossier' })))
      return;
    await adminApi(`/folders?id=${f.id}`, { method: 'DELETE' });
    setData((d) => (d ? { ...d, folders: d.folders.filter((x) => x.id !== f.id), galleries: d.galleries.map((g) => (g.folder_id === f.id ? { ...g, folder_id: null } : g)) } : d));
    setView('all');
  };

  const copyPw = async (g: AdminGallery) => {
    if (g.password && (await copyText(g.password))) toast.show(`Mot de passe copié : ${g.password}`);
  };

  /* ── Rendu ── */
  if (error && !data) {
    return (
      <div className={s.page}>
        <div className={s.layout} style={{ gridTemplateColumns: '1fr' }}>
          <div className={`${s.notice} ${s.noticeErr}`}>
            <b>Galeries clients indisponibles.</b> {error.msg}
            {error.setup ? (
              <>
                <br />
                Ouvrez Supabase → SQL Editor et exécutez <code>supabase/migrations/20261101000000_client_galleries.sql</code>, puis rechargez.
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const navBtn = (v: View, icon: React.ReactNode, label: string, n?: number) => (
    <button className={s.nav} aria-current={view === v} onClick={() => setView(v)}>
      {icon}
      <span className={s.label}>{label}</span>
      {n !== undefined ? <span className={s.n}>{n}</span> : null}
    </button>
  );

  const isListView = view !== 'templates' && view !== 'watermarks';

  return (
    <div className={s.page}>
      <div className={s.layout}>
        <aside className={s.side}>
          <a href="/admin" className={s.nav} style={{ textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Administration
          </a>
          <StorageMeter used={usedBytes} live />
          {navBtn('all', <LayoutGrid size={15} />, 'Toutes les galeries', counts.all)}
          {navBtn('published', <Globe size={15} />, 'Publiées', counts.published)}
          {navBtn('draft', <EyeOff size={15} />, 'Brouillons', counts.draft)}
          {navBtn('expiring', <CalendarClock size={15} />, 'Expirent / expirées', counts.expiring)}
          <div className={s.sideTitle}>
            Dossiers & séances
            <button onClick={newFolder} title="Nouveau dossier">
              <FolderPlus size={14} />
            </button>
          </div>
          {folders.map((f) => navBtn(`folder:${f.id}`, <FolderIcon size={15} />, f.name, counts.byFolder[f.id] || 0))}
          {!folders.length ? <p className={s.muted} style={{ padding: '0 10px', margin: 0 }}>Aucun dossier</p> : null}
          <div className={s.sideTitle}>Réglages</div>
          {navBtn('templates', <Layers size={15} />, 'Modèles', data?.templates.length)}
          {navBtn('watermarks', <Droplets size={15} />, 'Filigranes', data?.watermarks.length)}
          {navBtn('trash', <Trash2 size={15} />, 'Corbeille', counts.trash)}
        </aside>

        <main style={{ minWidth: 0 }}>
          {data && (!data.config.r2 || !data.config.secret) ? (
            <div className={s.notice}>
              {!data.config.r2 ? (
                <>
                  <CloudOff size={15} style={{ verticalAlign: -3 }} /> <b>Stockage R2 non configuré</b> : l’envoi de fichiers est désactivé. Ajoutez{' '}
                  <code>R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY_ID</code>, <code>R2_SECRET_ACCESS_KEY</code> et <code>R2_BUCKET</code> (voir docs/GALERIES-CLIENTS-2026.md).{' '}
                </>
              ) : null}
              {!data.config.secret ? (
                <>
                  Conseillé : définissez <code>GALLERY_SECRET</code> (32 caractères aléatoires) pour protéger mots de passe et accès.
                </>
              ) : null}
            </div>
          ) : null}

          {view === 'templates' && data ? (
            <>
              <div className={s.top}>
                <h1 className={s.h1}>Modèles de galerie</h1>
              </div>
              <p className={s.muted} style={{ marginTop: -8, marginBottom: 16 }}>
                Un modèle = tous les réglages d’une galerie. Il est copié à la création : le modifier ne change pas les galeries déjà livrées.
              </p>
              <TemplatesManager
                templates={data.templates}
                watermarks={data.watermarks}
                galleries={data.galleries}
                onChange={(t) => setData({ ...data, templates: t })}
                onGalleries={replace}
                toast={toast.show}
              />
            </>
          ) : null}

          {view === 'watermarks' && data ? (
            <>
              <div className={s.top}>
                <h1 className={s.h1}>Filigranes</h1>
              </div>
              <WatermarksManager watermarks={data.watermarks} onChange={(w) => setData({ ...data, watermarks: w })} toast={toast.show} />
            </>
          ) : null}

          {isListView ? (
            <>
              <div className={s.top}>
                <h1 className={s.h1}>
                  {currentFolder
                    ? currentFolder.name
                    : { all: 'Galeries clients', published: 'Publiées', draft: 'Brouillons', expiring: 'Expirent bientôt', trash: 'Corbeille' }[view as string]}
                </h1>
                {currentFolder ? (
                  <>
                    <AdminButton size="sm" variant="ghost" iconOnly aria-label="Renommer" onClick={() => renameFolder(currentFolder)}>
                      <Pencil size={14} />
                    </AdminButton>
                    <AdminButton size="sm" variant="ghost" iconOnly aria-label="Supprimer le dossier" onClick={() => deleteFolder(currentFolder)}>
                      <Trash2 size={14} />
                    </AdminButton>
                  </>
                ) : null}
                <label className={s.search}>
                  <Search size={15} />
                  <input placeholder="Titre, client, e-mail, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
                  {q ? (
                    <button onClick={() => setQ('')} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }} aria-label="Effacer">
                      <X size={14} />
                    </button>
                  ) : null}
                </label>
                <span className={s.spacer} />
                {view !== 'trash' ? (
                  <>
                    <AdminButton variant="secondary" leadingIcon={<FileSpreadsheet size={15} />} onClick={() => exportCsv(selected.length ? selected : list)} disabled={!list.length}>
                      Exporter{selected.length ? ` (${selected.length})` : ''}
                    </AdminButton>
                    <AdminButton variant="secondary" leadingIcon={<Users size={15} />} onClick={() => setDialog({ kind: 'session' })} disabled={!data?.config.r2}>
                      Nouvelle séance
                    </AdminButton>
                    <AdminButton variant="primary" leadingIcon={<Plus size={15} />} onClick={() => setDialog({ kind: 'new' })} disabled={!data}>
                      Nouvelle galerie
                    </AdminButton>
                  </>
                ) : null}
              </div>

              <div className={s.filters}>
                <select className={s.select} value={access} onChange={(e) => setAccess(e.target.value)} aria-label="Accès">
                  <option value="">Tous les accès</option>
                  <option value="password">Mot de passe</option>
                  <option value="link">Lien direct</option>
                  <option value="public">Publique</option>
                </select>
                <select className={s.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Tri">
                  <option value="created">Plus récentes</option>
                  <option value="event">Date d’évènement</option>
                  <option value="title">Nom</option>
                  <option value="views">Plus vues</option>
                  <option value="size">Plus lourdes</option>
                </select>
                <span className={s.muted}>
                  {list.length} galerie{list.length > 1 ? 's' : ''} · {formatBytes(list.reduce((a, g) => a + g.stored_bytes, 0))}
                </span>
                <span className={s.spacer} />
                {list.length ? (
                  <AdminButton size="sm" variant="ghost" onClick={() => setSel(sel.size === list.length ? new Set() : new Set(list.map((g) => g.id)))}>
                    {sel.size === list.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </AdminButton>
                ) : null}
                <div className={s.seg}>
                  <button
                    aria-pressed={layout === 'grid'}
                    onClick={() => {
                      setLayout('grid');
                      localStorage.setItem('cg_layout', 'grid');
                    }}
                    aria-label="Grille"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    aria-pressed={layout === 'table'}
                    onClick={() => {
                      setLayout('table');
                      localStorage.setItem('cg_layout', 'table');
                    }}
                    aria-label="Tableau"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>

              {!data ? (
                <div className={s.empty}>Chargement…</div>
              ) : !list.length ? (
                <div className={s.empty}>
                  <h3>{view === 'trash' ? 'Corbeille vide' : q ? 'Aucun résultat' : 'Aucune galerie ici'}</h3>
                  {view !== 'trash' && !q ? <p>Créez une galerie, ou une séance pour livrer plusieurs personnes d’un coup.</p> : null}
                </div>
              ) : layout === 'grid' ? (
                <div className={`${s.grid} ${sel.size ? s.selecting : ''}`}>
                  {list.map((g) => (
                    <article
                      key={g.id}
                      className={s.card}
                      data-selected={sel.has(g.id)}
                      onClick={(e) => (sel.size || e.shiftKey || e.metaKey || e.ctrlKey ? toggle(g.id, e) : router.push(`/admin/galeries/${g.id}`))}
                    >
                      <div className={s.thumb}>
                        {g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" style={coverPos(g)} /> : <ImageOff size={26} />}
                        <span
                          className={s.check}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(g.id, e);
                          }}
                          role="checkbox"
                          aria-checked={sel.has(g.id)}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <div className={s.badges}>
                          <span className={s.badge} title={ACCESS_LABEL[g.access_mode]}>
                            {g.access_mode === 'password' ? <Lock size={13} /> : g.access_mode === 'link' ? <Link2 size={13} /> : <Globe size={13} />}
                          </span>
                          {g.watermark_id ? (
                            <span className={s.badge} title="Filigrane">
                              <Droplets size={13} />
                            </span>
                          ) : null}
                          <span className={s.badge} title={g.download.enabled ? 'Téléchargement activé' : 'Téléchargement désactivé'}>
                            {g.download.enabled ? <Download size={13} /> : <DownloadCloud size={13} style={{ opacity: 0.45 }} />}
                          </span>
                        </div>
                        {view !== 'trash' ? (
                          <div className={s.quick} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setDialog({ kind: 'share', gallery: g })}>
                              <Share2 size={13} /> Partager
                            </button>
                            {g.access_mode === 'password' ? (
                              <button onClick={() => copyPw(g)}>
                                <KeyRound size={13} /> Code
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className={s.meta}>
                        <h3 title={g.title}>{g.title}</h3>
                        <p>
                          <span className={s.pill} data-s={statusOf(g)}>
                            {statusLabel(g)}
                          </span>
                          <span>{g.photo_count} él.</span>
                          <span className={s.dot} />
                          <span>{formatBytes(g.stored_bytes)}</span>
                          {g.event_date ? (
                            <>
                              <span className={s.dot} />
                              <span>{fmtDate(g.event_date)}</span>
                            </>
                          ) : null}
                          {g.view_count ? (
                            <>
                              <span className={s.dot} />
                              <span title="Vues">
                                <Eye size={12} style={{ verticalAlign: -1 }} /> {g.view_count}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <span
                            className={s.cb}
                            data-on={sel.size === list.length}
                            onClick={() => setSel(sel.size === list.length ? new Set() : new Set(list.map((g) => g.id)))}
                            role="checkbox"
                            aria-checked={sel.size === list.length}
                          >
                            <Check size={12} strokeWidth={3} />
                          </span>
                        </th>
                        <th>Galerie</th>
                        <th>Statut</th>
                        <th>Accès</th>
                        <th>Mot de passe</th>
                        <th>Téléch.</th>
                        <th>Éléments</th>
                        <th>Poids</th>
                        <th>Ouverte</th>
                        <th>Vues</th>
                        <th>Téléch.</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((g) => (
                        <tr
                          key={g.id}
                          data-selected={sel.has(g.id)}
                          onClick={(e) => (sel.size || e.shiftKey ? toggle(g.id, e) : router.push(`/admin/galeries/${g.id}`))}
                        >
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(g.id, e);
                            }}
                          >
                            <span className={s.cb} data-on={sel.has(g.id)}>
                              <Check size={12} strokeWidth={3} />
                            </span>
                          </td>
                          <td>
                            <div className={s.tTitle}>
                              {g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" style={coverPos(g)} /> : <span className={s.ph} />}
                              <div>
                                <span>{g.title}</span>
                                <small>
                                  {[g.client_name, g.client_email, g.event_date ? fmtDate(g.event_date) : null].filter(Boolean).join(' · ') || g.slug}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={s.pill} data-s={statusOf(g)}>
                              {statusLabel(g)}
                            </span>
                          </td>
                          <td>{ACCESS_LABEL[g.access_mode]}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {g.access_mode === 'password' && g.password ? (
                              <span className={s.mono} onClick={() => copyPw(g)} title="Copier">
                                {g.password} <Copy size={12} />
                              </span>
                            ) : (
                              <span className={s.muted}>—</span>
                            )}
                          </td>
                          <td>{g.download.enabled ? <span className={s.ok}>{g.download.sizes.map((x) => (x === 'original' ? 'HD' : 'web')).join(' + ')}</span> : <span className={s.muted}>Non</span>}</td>
                          <td>{g.photo_count}</td>
                          <td>{formatBytes(g.stored_bytes)}</td>
                          <td>{g.first_viewed_at ? <span className={s.ok}>{fmtDate(g.first_viewed_at)}</span> : <span className={s.muted}>Jamais</span>}</td>
                          <td>{g.view_count}</td>
                          <td>{g.download_count}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {view !== 'trash' ? (
                              <AdminButton size="sm" variant="ghost" iconOnly aria-label="Partager" onClick={() => setDialog({ kind: 'share', gallery: g })}>
                                <Share2 size={14} />
                              </AdminButton>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>

      {/* ── Barre d'actions groupées ── */}
      {sel.size > 0 && isListView ? (
        <div className={s.bulk}>
          <span className={s.count}>
            {sel.size} sélectionnée{sel.size > 1 ? 's' : ''}
          </span>
          {view === 'trash' ? (
            <>
              <button onClick={() => bulk({ deleted: false }, '{n} restaurée(s)')}>
                <RotateCcw size={15} /> Restaurer
              </button>
              <button className={s.danger} onClick={() => destroy(Array.from(sel))}>
                <Trash2 size={15} /> Supprimer définitivement
              </button>
            </>
          ) : (
            <>
              <button onClick={() => bulk({ status: 'published' }, '{n} publiée(s)')}>
                <Globe size={15} /> Publier
              </button>
              <button onClick={() => bulk({ status: 'draft' }, '{n} dépubliée(s)')}>
                <EyeOff size={15} /> Dépublier
              </button>
              <button onClick={() => setChoice({ kind: 'access', value: 'password' })}>
                <Lock size={15} /> Accès
              </button>
              <button
                onClick={async () => {
                  if (await confirmDialog({ title: `Nouveaux mots de passe pour ${sel.size} galerie(s) ?`, message: 'Les anciens mots de passe et liens magiques cesseront de fonctionner.', confirmLabel: 'Générer' }))
                    bulk({ regenerate_password: true, access_mode: 'password' }, 'Nouveaux mots de passe : {n}');
                }}
              >
                <KeyRound size={15} /> Mots de passe
              </button>
              <button onClick={() => setChoice({ kind: 'download', value: 'on' })}>
                <Download size={15} /> Téléchargement
              </button>
              <button onClick={() => setChoice({ kind: 'watermark', value: data?.watermarks[0]?.id || null })}>
                <Droplets size={15} /> Filigrane
              </button>
              <button onClick={() => setChoice({ kind: 'template', value: data?.templates.find((t) => t.is_default)?.id || data?.templates[0]?.id })}>
                <Layers size={15} /> Modèle
              </button>
              <button onClick={() => setChoice({ kind: 'expiry', value: '' })}>
                <CalendarClock size={15} /> Expiration
              </button>
              <button onClick={() => setChoice({ kind: 'folder', value: currentFolder?.id || null })}>
                <FolderIcon size={15} /> Dossier
              </button>
              <button
                onClick={async () => {
                  const t = await promptDialog({ title: 'Ajouter un tag', placeholder: 'corporate' });
                  if (t?.trim()) bulk({ add_tag: t.trim() }, 'Tag ajouté à {n} galerie(s)');
                }}
              >
                <Tag size={15} /> Tag
              </button>
              <button onClick={() => exportCsv(selected)}>
                <FileSpreadsheet size={15} /> Exporter
              </button>
              <span className={s.sep} />
              <button className={s.danger} onClick={() => bulk({ deleted: true }, '{n} galerie(s) dans la corbeille')}>
                <Trash2 size={15} /> Corbeille
              </button>
            </>
          )}
          <button onClick={() => setSel(new Set())} aria-label="Annuler la sélection" style={{ background: 'rgba(255,255,255,.1)', marginLeft: 4 }}>
            <X size={15} />
          </button>
        </div>
      ) : null}

      {/* ── Dialogues ── */}
      {choice?.kind === 'access' ? (
        <ChoiceDialog title="Mode d’accès" onClose={() => setChoice(null)} onApply={() => bulk({ access_mode: choice.value }, 'Accès modifié : {n}')}>
          <SelectField
            label="Accès"
            value={choice.value}
            onChange={(v) => setChoice({ ...choice, value: v })}
            options={[
              { value: 'password', label: 'Mot de passe' },
              { value: 'link', label: 'Lien direct' },
              { value: 'public', label: 'Publique' },
            ]}
          />
        </ChoiceDialog>
      ) : null}
      {choice?.kind === 'download' ? (
        <ChoiceDialog
          title="Téléchargement"
          onClose={() => setChoice(null)}
          onApply={() =>
            bulk(
              {
                download:
                  choice.value === 'off'
                    ? { enabled: false }
                    : choice.value === 'web'
                      ? { enabled: true, sizes: ['web'] }
                      : { enabled: true, sizes: ['original', 'web'] },
              },
              'Téléchargement modifié : {n}'
            )
          }
        >
          <SelectField
            label="Autoriser"
            value={choice.value}
            onChange={(v) => setChoice({ ...choice, value: v })}
            options={[
              { value: 'on', label: 'Oui — originaux HD + web' },
              { value: 'web', label: 'Oui — web seulement' },
              { value: 'off', label: 'Non — consultation seule' },
            ]}
          />
        </ChoiceDialog>
      ) : null}
      {choice?.kind === 'watermark' && data ? (
        <ChoiceDialog title="Filigrane" onClose={() => setChoice(null)} onApply={() => bulk({ watermark_id: choice.value }, 'Filigrane modifié : {n}')}>
          <WatermarkSelect value={choice.value} watermarks={data.watermarks} onChange={(v) => setChoice({ ...choice, value: v })} />
          <p className={s.muted}>Les aperçus filigranés se génèrent à l’ouverture de chaque galerie dans l’admin (bouton « Régénérer »).</p>
        </ChoiceDialog>
      ) : null}
      {choice?.kind === 'template' && data ? (
        <ChoiceDialog title="Appliquer un modèle" onClose={() => setChoice(null)} onApply={() => bulk({ apply_template: choice.value }, 'Modèle appliqué à {n} galerie(s)')}>
          <SelectField label="Modèle" value={choice.value || ''} onChange={(v) => setChoice({ ...choice, value: v })} options={data.templates.map((t) => ({ value: t.id, label: t.name }))} />
          <p className={s.muted}>Remplace accès, téléchargement, filigrane, favoris et présentation. Titres, mots de passe et fichiers ne changent pas.</p>
        </ChoiceDialog>
      ) : null}
      {choice?.kind === 'expiry' ? (
        <ChoiceDialog
          title="Expiration"
          onClose={() => setChoice(null)}
          onApply={() => bulk({ expires_at: choice.value ? new Date(choice.value + 'T23:59:00').toISOString() : null }, 'Expiration modifiée : {n}')}
        >
          <div>
            <span className={s.lbl}>Masquer automatiquement le</span>
            <div className={s.field}>
              <input type="date" value={choice.value} onChange={(e) => setChoice({ ...choice, value: e.target.value })} />
            </div>
          </div>
          <p className={s.muted}>Laisser vide = jamais.</p>
        </ChoiceDialog>
      ) : null}
      {choice?.kind === 'folder' ? (
        <ChoiceDialog title="Ranger dans un dossier" onClose={() => setChoice(null)} onApply={() => bulk({ folder_id: choice.value }, '{n} galerie(s) déplacée(s)')}>
          <FolderSelect value={choice.value} folders={folders} onChange={(v) => setChoice({ ...choice, value: v })} />
        </ChoiceDialog>
      ) : null}

      {dialog?.kind === 'new' && data ? (
        <NewGalleryDialog
          templates={data.templates}
          folders={folders}
          defaultFolder={currentFolder?.id}
          onClose={() => setDialog(null)}
          onCreated={(g) => router.push(`/admin/galeries/${g.id}`)}
        />
      ) : null}
      {dialog?.kind === 'session' && data ? (
        <SessionDialog
          templates={data.templates}
          watermarks={data.watermarks}
          onClose={() => {
            setDialog(null);
            load();
          }}
          onDone={(folderId) => {
            setDialog(null);
            load().then(() => folderId && setView(`folder:${folderId}`));
          }}
        />
      ) : null}
      {dialog?.kind === 'share' && dialog.gallery ? (
        <ShareDialog gallery={dialog.gallery} onClose={() => setDialog(null)} onChange={(g) => replace([g])} />
      ) : null}
      {toast.node}
    </div>
  );
}

/** Cadrage des vignettes de couverture selon le point d'intérêt choisi dans Présentation. */
function coverPos(g: AdminGallery): React.CSSProperties {
  const f = g.design?.focus;
  return f ? { objectPosition: `${f.x * 100}% ${f.y * 100}%` } : {};
}
