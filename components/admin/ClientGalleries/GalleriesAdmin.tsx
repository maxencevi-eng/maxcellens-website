"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  Check,
  CloudOff,
  Copy,
  Download,
  DownloadCloud,
  Droplets,
  FileSpreadsheet,
  Folder as FolderIcon,
  FolderOpen,
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
import { NewGalleryDialog } from './CreateDialogs';
import BulkImport from './BulkImport';
import ActivityOverview from './ActivityOverview';
import { TemplatesManager, WatermarksManager } from './Managers';
import {
  ACCESS_LABEL,
  childFolders,
  fmtDate,
  folderChain,
  FolderSelect,
  folderSubtree,
  galleriesCsv,
  ShareDialog,
  statusLabel,
  statusOf,
  useToast,
  WatermarkSelect,
} from './shared';
import s from './cg.module.css';

type Data = {
  galleries: AdminGallery[];
  folders: Folder[];
  templates: Template[];
  watermarks: Watermark[];
  config: { r2: boolean; secret: boolean };
};

type View = 'all' | 'draft' | 'published' | 'expiring' | 'nofolder' | 'trash' | 'templates' | 'watermarks' | 'activity' | `folder:${string}`;
type SortKey = 'created' | 'event' | 'title' | 'views' | 'size';

const VIEW_TITLE: Record<string, string> = {
  all: 'Galeries clients',
  published: 'Publiées',
  draft: 'Brouillons',
  expiring: 'Expirent bientôt',
  nofolder: 'Hors dossier',
  trash: 'Corbeille',
  templates: 'Modèles',
  watermarks: 'Filigranes',
  activity: 'Activité',
};

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
  const [dropTarget, setDropTarget] = useState<string | null>(null);
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
    const c = { all: 0, draft: 0, published: 0, expiring: 0, trash: 0, nofolder: 0 };
    const byFolder: Record<string, number> = {};
    for (const g of galleries) {
      const st = statusOf(g);
      if (st === 'trash') {
        c.trash++;
        continue;
      }
      c.all++;
      if (!g.folder_id) c.nofolder++;
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
    // Dans un dossier, la recherche couvre aussi ses sous-dossiers
    const subtree = view.startsWith('folder:') && needle ? folderSubtree(folders, view.slice(7)) : null;
    let l = galleries.filter((g) => {
      const st = statusOf(g);
      if (view === 'trash') return st === 'trash';
      if (st === 'trash') return false;
      if (view === 'draft') return g.status === 'draft';
      if (view === 'published') return g.status === 'published';
      if (view === 'expiring') return st === 'expiring' || st === 'expired';
      if (view === 'nofolder') return !g.folder_id;
      if (view.startsWith('folder:')) return subtree ? !!g.folder_id && subtree.has(g.folder_id) : g.folder_id === view.slice(7);
      // Racine : les galeries hors dossier (les dossiers s'affichent en cartes) ; la recherche couvre tout
      if (view === 'all') return needle ? true : !g.folder_id;
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
  }, [galleries, folders, view, q, access, sort]);
  const selected = list.filter((g) => sel.has(g.id));
  const currentFolder = view.startsWith('folder:') ? folders.find((f) => f.id === view.slice(7)) : null;
  const currentFolderId = currentFolder?.id ?? null;
  // Dossiers affichés en cartes : ceux du niveau courant (racine ou dossier ouvert)
  const levelFolders = view === 'all' || currentFolder ? childFolders(folders, currentFolderId) : [];
  const showFolderCards = !!data && !q.trim() && !access && levelFolders.length > 0;

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
    const label = n > 1 ? `${n} galeries` : `« ${galleries.find((g) => g.id === ids[0])?.title || 'cette galerie'} »`;
    // Double confirmation : l'action efface aussi les fichiers du stockage, sans retour possible
    if (
      !(await confirmDialog({
        title: `Supprimer définitivement ${label} ?`,
        message: 'Les photos, vidéos, documents et statistiques seront effacés. Les liens envoyés aux clients ne fonctionneront plus.',
        confirmLabel: 'Continuer',
        tone: 'danger',
      }))
    )
      return;
    if (
      !(await confirmDialog({
        title: 'Dernière confirmation',
        message: `${label} ${n > 1 ? 'seront supprimées' : 'sera supprimée'} définitivement. Cette action est irréversible.`,
        confirmLabel: 'Supprimer définitivement',
        tone: 'danger',
      }))
    )
      return;
    try {
      await adminApi('/bulk', { method: 'POST', json: { ids, action: 'destroy' } });
      setData((d) => (d ? { ...d, galleries: d.galleries.filter((g) => !ids.includes(g.id)) } : d));
      setSel(new Set());
      toast.show(n > 1 ? `${n} galeries supprimées définitivement` : 'Galerie supprimée définitivement');
    } catch (e: any) {
      toast.show(e.message);
    }
  };

  const exportCsv = (rows: AdminGallery[]) => {
    const name = currentFolder ? currentFolder.name : view === 'all' ? 'toutes' : view;
    downloadTextFile(`galeries-${name.replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`, galleriesCsv(rows, folders));
    toast.show(`Export : ${rows.length} galerie${rows.length > 1 ? 's' : ''}`);
  };

  const folderError = (e: any) =>
    toast.show(
      /parent_id|position/.test(e?.message || '')
        ? 'Sous-dossiers indisponibles : exécutez la migration 20261102000000_client_gallery_folders_tree.sql dans Supabase'
        : e?.message || 'Action impossible'
    );

  const newFolder = async () => {
    const name = await promptDialog({
      title: currentFolder ? `Nouveau sous-dossier dans « ${currentFolder.name} »` : 'Nouveau dossier',
      label: 'Nom',
      placeholder: currentFolder ? 'Portraits 2026' : 'BNP Paribas',
    });
    if (!name?.trim()) return;
    try {
      const j = await adminApi<{ folder: Folder }>('/folders', { method: 'POST', json: { name, parent_id: currentFolderId } });
      setData((d) => (d ? { ...d, folders: [...d.folders, j.folder] } : d));
      toast.show(`Dossier « ${j.folder.name} » créé`);
    } catch (e: any) {
      folderError(e);
    }
  };
  const renameFolder = async (f: Folder) => {
    const name = await promptDialog({ title: 'Renommer le dossier', defaultValue: f.name });
    if (!name?.trim()) return;
    try {
      const j = await adminApi<{ folders: Folder[] }>('/folders', { method: 'PATCH', json: { id: f.id, name } });
      setData((d) => (d ? { ...d, folders: j.folders } : d));
    } catch (e: any) {
      folderError(e);
    }
  };
  const deleteFolder = async (f: Folder) => {
    const parent = f.parent_id ? folders.find((x) => x.id === f.parent_id) : null;
    const dest = parent ? `dans « ${parent.name} »` : 'à la racine';
    if (
      !(await confirmDialog({
        title: `Supprimer le dossier « ${f.name} » ?`,
        message: `Ses galeries et sous-dossiers sont conservés et remontent ${dest}.`,
        tone: 'danger',
        confirmLabel: 'Supprimer le dossier',
      }))
    )
      return;
    await adminApi(`/folders?id=${f.id}`, { method: 'DELETE' });
    const up = f.parent_id || null;
    setData((d) =>
      d
        ? {
            ...d,
            folders: d.folders.filter((x) => x.id !== f.id).map((x) => (x.parent_id === f.id ? { ...x, parent_id: up } : x)),
            galleries: d.galleries.map((g) => (g.folder_id === f.id ? { ...g, folder_id: up } : g)),
          }
        : d
    );
    if (currentFolderId === f.id) setView(up ? `folder:${up}` : 'all');
  };

  /** Déplace un dossier : dedans (`into`), ou avant / après un dossier frère. */
  const moveFolder = async (id: string, target: Folder | null, zone: 'into' | 'before' | 'after') => {
    const moving = folders.find((f) => f.id === id);
    if (!moving || target?.id === id) return;
    const newParent = zone === 'into' ? target?.id ?? null : target?.parent_id ?? null;
    if (newParent && folderSubtree(folders, id).has(newParent)) {
      toast.show('Impossible de placer un dossier dans lui-même ou dans un de ses sous-dossiers');
      return;
    }
    const siblings = childFolders(folders, newParent)
      .filter((f) => f.id !== id)
      .map((f) => f.id);
    if (zone === 'into' || !target) siblings.push(id);
    else siblings.splice(siblings.indexOf(target.id) + (zone === 'after' ? 1 : 0), 0, id);
    // Mise à jour optimiste, puis état serveur
    setData((d) =>
      d
        ? {
            ...d,
            folders: d.folders.map((f) =>
              f.id === id ? { ...f, parent_id: newParent, position: siblings.indexOf(id) } : siblings.includes(f.id) ? { ...f, position: siblings.indexOf(f.id) } : f
            ),
          }
        : d
    );
    try {
      const j = await adminApi<{ folders: Folder[] }>('/folders', { method: 'PATCH', json: { id, parent_id: newParent, order: siblings } });
      setData((d) => (d ? { ...d, folders: j.folders } : d));
      if (zone === 'into') toast.show(`« ${moving.name} » déplacé ${target ? `dans « ${target.name} »` : 'à la racine'}`);
    } catch (e: any) {
      folderError(e);
      load();
    }
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

  /** Glisser-déposer : une galerie (ou la sélection qui la contient) vers un dossier. */
  const dragIds = (id: string) => (sel.has(id) ? Array.from(sel) : [id]);
  const onCardDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('application/x-cg-ids', JSON.stringify(dragIds(id)));
    e.dataTransfer.effectAllowed = 'move';
  };
  const moveToFolder = async (ids: string[], folderId: string | null) => {
    try {
      const j = await adminApi<{ galleries: AdminGallery[] }>('/bulk', { method: 'POST', json: { ids, action: 'patch', patch: { folder_id: folderId } } });
      replace(j.galleries);
      const name = folderId ? folders.find((f) => f.id === folderId)?.name : null;
      toast.show(`${j.galleries.length} galerie(s) ${name ? `rangée(s) dans « ${name} »` : 'retirée(s) du dossier'}`);
      setSel(new Set());
    } catch (e: any) {
      toast.show(e.message);
    }
  };
  const FOLDER_MIME = 'application/x-cg-folder';
  const GALLERY_MIME = 'application/x-cg-ids';

  /** Cible « dedans » : racine, fil d'Ariane… accepte galeries et dossiers. */
  const dropProps = (folderId: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      const t = e.dataTransfer.types;
      if (!t.includes(GALLERY_MIME) && !t.includes(FOLDER_MIME)) return;
      e.preventDefault();
      setDropTarget(folderId ?? '__none__');
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(null);
      const fid = e.dataTransfer.getData(FOLDER_MIME);
      if (fid) {
        moveFolder(fid, folderId ? folders.find((f) => f.id === folderId) || null : null, 'into');
        return;
      }
      try {
        const ids = JSON.parse(e.dataTransfer.getData(GALLERY_MIME) || '[]');
        if (Array.isArray(ids) && ids.length) moveToFolder(ids, folderId);
      } catch {}
    },
  });

  /** Carte de dossier : bords = réordonner (avant / après), centre = déplacer dedans. */
  const zoneOf = (e: React.DragEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    return x < 0.25 ? 'before' : x > 0.75 ? 'after' : 'into';
  };
  const folderCardProps = (f: Folder) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(FOLDER_MIME, f.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: React.DragEvent) => {
      const t = e.dataTransfer.types;
      if (t.includes(GALLERY_MIME)) {
        e.preventDefault();
        setDropTarget(`${f.id}:into`);
      } else if (t.includes(FOLDER_MIME)) {
        e.preventDefault();
        setDropTarget(`${f.id}:${zoneOf(e)}`);
      }
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(null);
      const fid = e.dataTransfer.getData(FOLDER_MIME);
      if (fid) {
        if (fid !== f.id) moveFolder(fid, f, zoneOf(e));
        return;
      }
      try {
        const ids = JSON.parse(e.dataTransfer.getData(GALLERY_MIME) || '[]');
        if (Array.isArray(ids) && ids.length) moveToFolder(ids, f.id);
      } catch {}
    },
    'data-drop': dropTarget?.startsWith(`${f.id}:`) ? dropTarget.split(':')[1] : undefined,
  });

  const navBtn = (v: View, icon: React.ReactNode, label: string, n?: number, extra?: Record<string, any>) => (
    <button key={v} className={s.nav} aria-current={view === v} onClick={() => setView(v)} {...extra}>
      <span className={s.navIcon}>{icon}</span>
      <span className={s.label}>{label}</span>
      {n !== undefined ? <span className={s.n}>{n}</span> : null}
    </button>
  );

  const isListView = view !== 'templates' && view !== 'watermarks' && view !== 'activity';

  return (
    <div className={s.page}>
      <div className={s.layout}>
        <aside className={s.side}>
          <a href="/admin" className={s.back}>
            <ArrowLeft size={14} /> Administration
          </a>
          <StorageMeter used={usedBytes} live />

          <div className={s.sideGroup}>
            <div className={s.sideTitle}>Galeries</div>
            {navBtn('all', <LayoutGrid size={15} />, 'Galeries clients', counts.all, { ...dropProps(null), 'data-drop': dropTarget === '__none__', title: 'Racine : dossiers et galeries hors dossier' })}
            {navBtn('published', <Globe size={15} />, 'Publiées', counts.published)}
            {navBtn('draft', <EyeOff size={15} />, 'Brouillons', counts.draft)}
            {navBtn('expiring', <CalendarClock size={15} />, 'Expirent / expirées', counts.expiring)}
          </div>

          <div className={s.sideGroup}>
            <div className={s.sideTitle}>Suivi</div>
            {navBtn('activity', <ActivityIcon size={15} />, 'Activité')}
          </div>

          <div className={s.sideGroup}>
            <div className={s.sideTitle}>Réglages</div>
            {navBtn('templates', <Layers size={15} />, 'Modèles', data?.templates.length)}
            {navBtn('watermarks', <Droplets size={15} />, 'Filigranes', data?.watermarks.length)}
            {navBtn('trash', <Trash2 size={15} />, 'Corbeille', counts.trash)}
          </div>
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

          {view === 'activity' && data ? (
            <ActivityOverview galleries={data.galleries} folders={folders} onOpenGallery={(id, t) => {
                const qs = new URLSearchParams();
                if (t?.tab) qs.set('tab', t.tab);
                if (t?.video) qs.set('video', t.video);
                if (t?.share) qs.set('share', '1');
                router.push(`/admin/galeries/${id}${qs.toString() ? `?${qs}` : ''}`);
              }} />
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
              {view !== 'all' ? (
                <nav className={s.crumbs} aria-label="Fil d’Ariane">
                  <button type="button" onClick={() => setView('all')} {...dropProps(null)} data-drop={dropTarget === '__none__'}>
                    <ArrowLeft size={14} /> Galeries clients
                  </button>
                  {/* Dossiers parents : cliquables, et cibles de dépôt pour remonter une galerie ou un dossier */}
                  {folderChain(folders, currentFolderId)
                    .slice(0, -1)
                    .map((f) => (
                      <React.Fragment key={f.id}>
                        <span aria-hidden>/</span>
                        <button type="button" onClick={() => setView(`folder:${f.id}`)} {...dropProps(f.id)} data-drop={dropTarget === f.id}>
                          {f.name}
                        </button>
                      </React.Fragment>
                    ))}
                  <span aria-hidden>/</span>
                  <span>{currentFolder ? currentFolder.name : VIEW_TITLE[view as string]}</span>
                </nav>
              ) : null}
              <div className={s.top}>
                <h1 className={s.h1}>
                  {currentFolder ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <FolderOpen size={24} style={{ color: 'var(--adm-ink-muted)' }} /> {currentFolder.name}
                    </span>
                  ) : (
                    VIEW_TITLE[view as string]
                  )}
                </h1>
                {currentFolder ? (
                  <div className={s.folderActions}>
                    <AdminButton size="sm" variant="ghost" leadingIcon={<Pencil size={14} />} onClick={() => renameFolder(currentFolder)}>
                      Renommer
                    </AdminButton>
                    <AdminButton size="sm" variant="dangerGhost" leadingIcon={<Trash2 size={14} />} onClick={() => deleteFolder(currentFolder)}>
                      Supprimer
                    </AdminButton>
                  </div>
                ) : null}
                <span className={s.spacer} />
                {view !== 'trash' ? (
                  <div className={s.toolbar}>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      leadingIcon={<FileSpreadsheet size={15} />}
                      onClick={() => exportCsv(selected.length ? selected : list)}
                      disabled={!list.length}
                      title="Exporter la liste (liens, mots de passe…) en CSV / Excel"
                    >
                      Exporter{selected.length ? ` (${selected.length})` : ''}
                    </AdminButton>
                    <span className={s.toolbarSep} />
                    <AdminButton size="sm" variant="secondary" leadingIcon={<Layers size={15} />} onClick={() => setDialog({ kind: 'bulk' })} disabled={!data?.config.r2} title="Toutes les photos d’un coup, groupées en galeries">
                      Import en masse
                    </AdminButton>
                    {view === 'all' || currentFolder ? (
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        leadingIcon={<FolderPlus size={15} />}
                        onClick={newFolder}
                        title={currentFolder ? `Créer un sous-dossier dans « ${currentFolder.name} »` : 'Créer un dossier pour ranger des galeries'}
                      >
                        Dossier
                      </AdminButton>
                    ) : null}
                    <AdminButton size="sm" variant="primary" leadingIcon={<Plus size={15} />} onClick={() => setDialog({ kind: 'new' })} disabled={!data}>
                      Galerie
                    </AdminButton>
                  </div>
                ) : null}
              </div>

              <div className={s.filters}>
                <label className={s.search}>
                  <Search size={15} />
                  <input placeholder="Rechercher : titre, client, e-mail, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
                  {q ? (
                    <button onClick={() => setQ('')} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }} aria-label="Effacer">
                      <X size={14} />
                    </button>
                  ) : null}
                </label>
                <select className={s.select} value={access} onChange={(e) => setAccess(e.target.value)} aria-label="Accès">
                  <option value="">Tous les accès</option>
                  <option value="password">Mot de passe</option>
                  <option value="link">Lien direct</option>
                  <option value="public">Publique</option>
                </select>
                <select className={s.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Tri">
                  <option value="created">Plus récentes</option>
                  <option value="event">Date d’événement</option>
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

              {/* Racine : les dossiers d'abord, en cartes */}
              {showFolderCards ? (
                <>
                  <div className={s.sectionHead}>
                    {currentFolder ? 'Sous-dossiers' : 'Dossiers'} <span>{levelFolders.length}</span>
                    <em className={s.sectionHint}>
                      Glissez une galerie ou un dossier dessus pour l’y ranger · sur le bord gauche / droit d’un dossier pour changer l’ordre
                    </em>
                  </div>
                  <div className={s.grid} style={{ marginBottom: 28 }}>
                    {levelFolders.map((f) => {
                      // Contenu de tout le sous-arbre : galeries et sous-dossiers
                      const tree = folderSubtree(folders, f.id);
                      const inFolder = galleries.filter((g) => g.folder_id && tree.has(g.folder_id) && !g.deleted_at);
                      const subCount = tree.size - 1;
                      const covers = inFolder.map((g) => ({ url: g.cover_url, pos: coverPos(g) })).filter((c) => c.url).slice(0, 4);
                      return (
                        <article
                          key={f.id}
                          className={`${s.card} ${s.folderCard}`}
                          onClick={() => setView(`folder:${f.id}`)}
                          {...folderCardProps(f)}
                        >
                          <div className={s.folderMosaic} data-n={covers.length}>
                            {covers.length ? covers.map((c, i) => <img key={i} src={c.url!} alt="" loading="lazy" style={c.pos} />) : <FolderIcon size={34} />}
                          </div>
                          <div className={s.quick} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => renameFolder(f)}>
                              <Pencil size={13} /> Renommer
                            </button>
                            <button onClick={() => deleteFolder(f)} aria-label="Supprimer le dossier">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className={s.meta}>
                            <h3 title={f.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <FolderIcon size={15} style={{ flex: 'none', color: 'var(--adm-ink-muted)' }} /> {f.name}
                            </h3>
                            <p>
                              <span>
                                {inFolder.length} galerie{inFolder.length > 1 ? 's' : ''}
                              </span>
                              {subCount ? (
                                <>
                                  <span className={s.dot} />
                                  <span>
                                    {subCount} sous-dossier{subCount > 1 ? 's' : ''}
                                  </span>
                                </>
                              ) : null}
                              <span className={s.dot} />
                              <span>{formatBytes(inFolder.reduce((a, g) => a + g.stored_bytes, 0))}</span>
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {list.length ? (
                    <div className={s.sectionHead}>
                      {currentFolder ? 'Galeries' : 'Galeries hors dossier'} <span>{list.length}</span>
                    </div>
                  ) : null}
                </>
              ) : null}

              {!data ? (
                <div className={s.empty}>Chargement…</div>
              ) : !list.length ? (
                showFolderCards ? null : (
                <div className={s.empty}>
                  <h3>{view === 'trash' ? 'Corbeille vide' : q ? 'Aucun résultat' : 'Aucune galerie ici'}</h3>
                  {view !== 'trash' && !q ? <p>Créez une galerie, ou utilisez l’import en masse pour en créer plusieurs d’un coup.</p> : null}
                </div>
                )
              ) : layout === 'grid' ? (
                <div className={`${s.grid} ${sel.size ? s.selecting : ''}`}>
                  {list.map((g) => (
                    <article
                      key={g.id}
                      className={s.card}
                      data-selected={sel.has(g.id)}
                      draggable={view !== 'trash'}
                      onDragStart={(e) => onCardDragStart(e, g.id)}
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
                          draggable={view !== 'trash'}
                          onDragStart={(e) => onCardDragStart(e, g.id)}
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
        <div className={s.bulkPanel} role="toolbar" aria-label="Actions sur la sélection">
          <div className={s.bulkHead}>
            <span className={s.bulkCount}>{sel.size}</span>
            <b>
              galerie{sel.size > 1 ? 's' : ''} sélectionnée{sel.size > 1 ? 's' : ''}
            </b>
            {sel.size < list.length ? (
              <button className={s.bulkLink} onClick={() => setSel(new Set(list.map((g) => g.id)))}>
                Tout sélectionner ({list.length})
              </button>
            ) : null}
            <span className={s.spacer} />
            <button className={s.bulkClose} onClick={() => setSel(new Set())} aria-label="Annuler la sélection">
              <X size={16} /> Désélectionner
            </button>
          </div>
          {view === 'trash' ? (
            <div className={s.bulkBody}>
              <div className={s.bulkGroup}>
                <button className={s.bulkBtn} onClick={() => bulk({ deleted: false }, '{n} restaurée(s)')}>
                  <RotateCcw size={16} /> Restaurer
                </button>
                <button className={`${s.bulkBtn} ${s.bulkDanger}`} onClick={() => destroy(Array.from(sel))}>
                  <Trash2 size={16} /> Supprimer définitivement
                </button>
              </div>
            </div>
          ) : (
            <div className={s.bulkBody}>
              <div className={s.bulkGroup}>
                <span className={s.bulkLabel}>Publication</span>
                <button className={s.bulkBtn} onClick={() => bulk({ status: 'published' }, '{n} publiée(s)')}>
                  <Globe size={16} /> Publier
                </button>
                <button className={s.bulkBtn} onClick={() => bulk({ status: 'draft' }, '{n} dépubliée(s)')}>
                  <EyeOff size={16} /> Dépublier
                </button>
              </div>
              <div className={s.bulkGroup}>
                <span className={s.bulkLabel}>Accès</span>
                <button className={s.bulkBtn} onClick={() => setChoice({ kind: 'access', value: 'password' })}>
                  <Lock size={16} /> Mode d’accès
                </button>
                <button
                  className={s.bulkBtn}
                  onClick={async () => {
                    if (await confirmDialog({ title: `Nouveaux mots de passe pour ${sel.size} galerie(s) ?`, message: 'Les anciens mots de passe et liens magiques cesseront de fonctionner.', confirmLabel: 'Générer' }))
                      bulk({ regenerate_password: true, access_mode: 'password' }, 'Nouveaux mots de passe : {n}');
                  }}
                >
                  <KeyRound size={16} /> Mots de passe
                </button>
                <button className={s.bulkBtn} onClick={() => setChoice({ kind: 'download', value: 'on' })}>
                  <Download size={16} /> Téléchargement
                </button>
                <button className={s.bulkBtn} onClick={() => setChoice({ kind: 'expiry', value: '' })}>
                  <CalendarClock size={16} /> Expiration
                </button>
              </div>
              <div className={s.bulkGroup}>
                <span className={s.bulkLabel}>Réglages</span>
                <button className={s.bulkBtn} onClick={() => setChoice({ kind: 'template', value: data?.templates.find((t) => t.is_default)?.id || data?.templates[0]?.id })}>
                  <Layers size={16} /> Modèle
                </button>
                <button className={s.bulkBtn} onClick={() => setChoice({ kind: 'watermark', value: data?.watermarks[0]?.id || null })}>
                  <Droplets size={16} /> Filigrane
                </button>
              </div>
              <div className={s.bulkGroup}>
                <span className={s.bulkLabel}>Organisation</span>
                <button className={s.bulkBtn} onClick={() => setChoice({ kind: 'folder', value: currentFolder?.id || null })}>
                  <FolderIcon size={16} /> Déplacer
                </button>
                <button
                  className={s.bulkBtn}
                  onClick={async () => {
                    const t = await promptDialog({ title: 'Ajouter un tag', placeholder: 'corporate' });
                    if (t?.trim()) bulk({ add_tag: t.trim() }, 'Tag ajouté à {n} galerie(s)');
                  }}
                >
                  <Tag size={16} /> Tag
                </button>
              </div>
              <div className={`${s.bulkGroup} ${s.bulkGroupEnd}`}>
                <button className={`${s.bulkBtn} ${s.bulkPrimary}`} onClick={() => exportCsv(selected)}>
                  <FileSpreadsheet size={16} /> Exporter liens et mots de passe
                </button>
                <button className={`${s.bulkBtn} ${s.bulkDanger}`} onClick={() => bulk({ deleted: true }, '{n} galerie(s) dans la corbeille')} title="Récupérable pendant 30 jours">
                  <Trash2 size={16} /> Corbeille
                </button>
                <button className={`${s.bulkBtn} ${s.bulkDangerSolid}`} onClick={() => destroy(Array.from(sel))} title="Efface aussi les fichiers, sans passer par la corbeille">
                  <Trash2 size={16} /> Supprimer définitivement
                </button>
              </div>
            </div>
          )}
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
      {dialog?.kind === 'bulk' && data ? (
        <BulkImport
          templates={data.templates}
          watermarks={data.watermarks}
          folders={folders}
          defaultFolderId={currentFolder?.id || null}
          onClose={() => setDialog(null)}
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
