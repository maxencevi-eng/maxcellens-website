"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Activity,
  ArrowLeft,
  Copy,
  Download,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Film,
  FolderInput,
  Heart,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Lock,
  Monitor,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Share2,
  Smartphone,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AdminButton, SelectField, TextField, confirmDialog, promptDialog } from '..';
import {
  DEFAULT_SHARE_MESSAGE,
  formatBytes,
  formatDuration,
  slugify,
  watermarkKey,
  type AdminGallery,
  type AdminPhoto,
  type Folder,
  type GallerySet,
  type Template,
  type Watermark,
} from '../../../lib/clientGalleries/types';
import { adminApi, copyText } from './api';
import { StorageMeter } from './GalleriesAdmin';
import {
  AccessFields,
  DesignFields,
  DownloadFields,
  FavoritesFields,
  FolderSelect,
  ShareDialog,
  TagInput,
  WatermarkSelect,
  fmtDate,
  galleryLink,
  previewLink,
  statusLabel,
  statusOf,
  useToast,
} from './shared';
import { regenerateWatermarks, uploadFiles, type UploadProgress } from './uploader';
import s from './cg.module.css';

type Tab = 'files' | 'design' | 'settings' | 'activity';

/** Champs modifiables par les onglets Présentation / Réglages. */
const EDITABLE = [
  'title', 'slug', 'client_name', 'client_email', 'event_date', 'folder_id', 'tags', 'access_mode', 'magic_link_enabled',
  'email_gate', 'expires_at', 'watermark_id', 'download', 'favorites', 'design', 'share_message', 'intro', 'password', 'download_pin',
] as const;

function pick(g: AdminGallery) {
  const o: any = {};
  for (const k of EDITABLE) o[k] = (g as any)[k];
  return o;
}

export default function GalleryEditor({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [g, setG] = useState<AdminGallery | null>(null);
  const [sets, setSets] = useState<GallerySet[]>([]);
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [meta, setMeta] = useState<{ folders: Folder[]; templates: Template[]; watermarks: Watermark[]; r2: boolean; used: number } | null>(null);
  const [tab, setTab] = useState<Tab>('files');
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [share, setShare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [detail, all] = await Promise.all([adminApi(`/${id}`), adminApi('')]);
      setG(detail.gallery);
      setDraft(pick(detail.gallery));
      setSets(detail.sets);
      setPhotos(detail.photos);
      setMeta({
        folders: all.folders,
        templates: all.templates,
        watermarks: all.watermarks,
        r2: all.config.r2,
        used: all.galleries.reduce((a: number, x: AdminGallery) => a + (x.stored_bytes || 0), 0),
      });
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  const reloadPhotos = useCallback(async () => {
    const detail = await adminApi(`/${id}`);
    setPhotos(detail.photos);
    setSets(detail.sets);
    setG((cur) => (cur ? { ...cur, photo_count: detail.gallery.photo_count, bytes_total: detail.gallery.bytes_total, stored_bytes: detail.gallery.stored_bytes, cover_photo_id: detail.gallery.cover_photo_id, cover_url: detail.gallery.cover_url } : detail.gallery));
    setMeta((m) => (m ? { ...m, used: m.used - (g?.stored_bytes || 0) + detail.gallery.stored_bytes } : m));
  }, [id, g?.stored_bytes]);

  useEffect(() => {
    load();
  }, [load]);

  const dirtyKeys = useMemo(() => {
    if (!g || !draft) return [];
    const base = pick(g);
    return EDITABLE.filter((k) => JSON.stringify(base[k] ?? null) !== JSON.stringify(draft[k] ?? null));
  }, [g, draft]);

  const save = async () => {
    if (!g) return;
    setSaving(true);
    try {
      const patch: any = {};
      for (const k of dirtyKeys) patch[k] = draft[k];
      const j = await adminApi<{ gallery: AdminGallery }>(`/${g.id}`, { method: 'PATCH', json: patch });
      setG(j.gallery);
      setDraft(pick(j.gallery));
      setPreviewKey((k) => k + 1);
      toast.show('Enregistré');
    } catch (e: any) {
      toast.show(e.message);
    }
    setSaving(false);
  };

  const patchNow = async (patch: any, msg?: string) => {
    if (!g) return;
    const before = pick(g);
    const j = await adminApi<{ gallery: AdminGallery }>(`/${g.id}`, { method: 'PATCH', json: patch });
    const after = pick(j.gallery);
    setG(j.gallery);
    // Les champs non modifiés localement suivent le serveur (ex. mot de passe régénéré) ;
    // les saisies en cours sont conservées.
    setDraft((d: any) => {
      const n = { ...d };
      for (const k of EDITABLE) if (JSON.stringify(d[k] ?? null) === JSON.stringify(before[k] ?? null)) n[k] = after[k];
      return n;
    });
    if (msg) toast.show(msg);
    setPreviewKey((k) => k + 1);
    return j.gallery;
  };

  if (error) return <div className={s.page}><div className={s.edBody}><div className={`${s.notice} ${s.noticeErr}`}>{error}</div></div></div>;
  if (!g || !draft || !meta) return <div className={s.page}><div className={s.edBody}><div className={s.empty}>Chargement…</div></div></div>;

  const wm = g.watermark_id ? meta.watermarks.find((w) => w.id === g.watermark_id) || null : null;
  const st = statusOf(g);

  return (
    <div className={s.page}>
      <div className={s.edHead}>
        <AdminButton size="sm" variant="ghost" iconOnly aria-label="Retour" onClick={() => router.push('/admin/galeries')}>
          <ArrowLeft size={16} />
        </AdminButton>
        <div className={s.edTitle}>
          <h1 title={g.title}>{g.title}</h1>
          <small>
            /client/{g.slug} · {g.photo_count} élément{g.photo_count > 1 ? 's' : ''} · {formatBytes(g.stored_bytes)}
            {g.client_name ? ` · ${g.client_name}` : ''}
          </small>
        </div>
        <button
          className={s.statusBtn}
          data-s={g.status}
          title="Changer le statut"
          onClick={() => patchNow({ status: g.status === 'published' ? 'draft' : 'published' }, g.status === 'published' ? 'Repassée en brouillon' : 'Publiée')}
        >
          ● {g.status === 'published' ? (st === 'expired' ? 'Expirée' : 'Publiée') : 'Brouillon'}
        </button>
        <div className={s.ribbon}>
          <span className={s.rb}>
            <Lock size={12} />
            {{ password: 'Mot de passe', link: 'Lien direct', public: 'Publique' }[g.access_mode]}
          </span>
          <span className={s.rb} data-tone={g.download.enabled ? 'ok' : 'off'}>
            <Download size={12} />
            {g.download.enabled ? `Téléchargement : ${g.download.sizes.map((x) => (x === 'original' ? 'HD' : 'web')).join(' + ')}` : 'Téléchargement désactivé'}
          </span>
          <span className={s.rb}>
            <Droplets size={12} />
            {wm ? wm.name : 'Sans filigrane'}
          </span>
          {g.favorites.enabled ? (
            <span className={s.rb}>
              <Heart size={12} /> Favoris
            </span>
          ) : null}
        </div>
        <span className={s.spacer} />
        <AdminButton variant="ghost" leadingIcon={<Eye size={15} />} onClick={() => window.open(previewLink(g), '_blank', 'noopener')}>
          Aperçu
        </AdminButton>
        <AdminButton variant="primary" leadingIcon={<Share2 size={15} />} onClick={() => setShare(true)}>
          Partager
        </AdminButton>
      </div>

      <div className={s.tabs} role="tablist">
        {(
          [
            ['files', 'Fichiers', <ImageIcon size={15} key="i" />],
            ['design', 'Présentation', <Palette size={15} key="p" />],
            ['settings', 'Réglages', <Settings2 size={15} key="s" />],
            ['activity', 'Activité', <Activity size={15} key="a" />],
          ] as const
        ).map(([k, label, icon]) => (
          <button key={k} className={s.tab} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {icon} {label}
          </button>
        ))}
      </div>

      <div className={s.edBody}>
        {tab === 'files' ? (
          <FilesTab
            g={g}
            sets={sets}
            setSets={setSets}
            photos={photos}
            setPhotos={setPhotos}
            r2={meta.r2}
            wm={wm}
            used={meta.used}
            onChanged={reloadPhotos}
            onCover={(pid) => patchNow({ cover_photo_id: pid }, 'Couverture définie')}
            toast={toast.show}
          />
        ) : null}
        {tab === 'design' ? (
          <DesignTab
            g={g}
            draft={draft}
            setDraft={setDraft}
            photos={photos}
            previewKey={previewKey}
            onCover={(pid) => patchNow({ cover_photo_id: pid }, 'Couverture définie')}
            wm={wm}
            r2={meta.r2}
            onUploaded={reloadPhotos}
            toast={toast.show}
          />
        ) : null}
        {tab === 'settings' ? (
          <SettingsTab g={g} draft={draft} setDraft={setDraft} meta={meta} patchNow={patchNow} toast={toast.show} onTemplates={(t) => setMeta({ ...meta, templates: t })} />
        ) : null}
        {tab === 'activity' ? <ActivityTab g={g} toast={toast.show} /> : null}
      </div>

      {dirtyKeys.length && (tab === 'design' || tab === 'settings') ? (
        <div className={s.saveBar}>
          {dirtyKeys.length} modification{dirtyKeys.length > 1 ? 's' : ''}
          <AdminButton variant="ghost" onClick={() => setDraft(pick(g))}>
            Annuler
          </AdminButton>
          <AdminButton variant="primary" loading={saving} onClick={save}>
            Enregistrer
          </AdminButton>
        </div>
      ) : null}

      {share ? <ShareDialog gallery={g} onClose={() => setShare(false)} onChange={(x) => { setG(x); setDraft(pick(x)); }} /> : null}
      {toast.node}
    </div>
  );
}

/* ── Fichiers ─────────────────────────────────────────────────────────── */

function SortableTile({
  p,
  selected,
  isCover,
  onClick,
  disabled,
}: {
  p: AdminPhoto;
  selected: boolean;
  isCover: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={s.ph}
      data-selected={selected}
      data-hidden={p.hidden}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined, opacity: isDragging ? 0.7 : 1 }}
      onClick={onClick}
      title={`${p.filename} · ${formatBytes(p.bytes)}`}
      {...attributes}
      {...listeners}
    >
      {p.thumb_url ? (
        <img src={p.thumb_url} alt="" loading="lazy" draggable={false} />
      ) : (
        <div className={s.fileTile}>
          <FileText size={30} />
          {p.ext}
        </div>
      )}
      {p.kind === 'video' ? (
        <span className={s.phTag}>
          <Film size={11} /> {formatDuration(p.duration) || 'Vidéo'}
        </span>
      ) : null}
      {p.hidden ? (
        <span className={s.phTag}>
          <EyeOff size={11} /> Masqué
        </span>
      ) : null}
      {isCover ? (
        <span className={`${s.phTag} ${s.phTag2}`}>
          <Star size={11} /> Couverture
        </span>
      ) : null}
      <span className={s.phName}>{p.filename}</span>
    </div>
  );
}

const NO_SET = '__none__';

function FilesTab({
  g,
  sets,
  setSets,
  photos,
  setPhotos,
  r2,
  wm,
  used,
  onChanged,
  onCover,
  toast,
}: {
  g: AdminGallery;
  sets: GallerySet[];
  setSets: (s: GallerySet[]) => void;
  photos: AdminPhoto[];
  setPhotos: (p: AdminPhoto[]) => void;
  r2: boolean;
  wm: Watermark | null;
  used: number;
  onChanged: () => Promise<void>;
  onCover: (id: string) => void;
  toast: (m: string) => void;
}) {
  const [setView, setSetView] = useState<string>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [over, setOver] = useState(false);
  const [prog, setProg] = useState<UploadProgress | null>(null);
  const [regen, setRegen] = useState<{ done: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef({ cancelled: false });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const visible = useMemo(() => {
    if (setView === 'all') return photos;
    if (setView === NO_SET) return photos.filter((p) => !p.set_id);
    return photos.filter((p) => p.set_id === setView);
  }, [photos, setView]);

  const wmKey = watermarkKey(wm);
  const staleWm = wm ? photos.filter((p) => p.kind === 'image' && p.has_preview && p.wm_key !== wmKey).length : 0;

  const startUpload = async (files: File[]) => {
    if (!files.length) return;
    if (!r2) return toast('Stockage R2 non configuré');
    cancel.current = { cancelled: false };
    const res = await uploadFiles(g.id, files, {
      setId: setView !== 'all' && setView !== NO_SET ? setView : null,
      watermark: wm,
      wmKey,
      signal: cancel.current,
      onProgress: setProg,
    });
    await onChanged();
    toast(res.errors.length ? `${res.done - res.errors.length} envoyé(s), ${res.errors.length} erreur(s)` : `${res.done} fichier(s) envoyé(s)`);
    if (!res.errors.length) setTimeout(() => setProg(null), 1500);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!e.dataTransfer.files?.length) return;
    // Dossiers déposés : on parcourt leur contenu
    const items = Array.from(e.dataTransfer.items || []);
    const files: File[] = [];
    const walk = async (entry: any): Promise<void> => {
      if (entry.isFile) files.push(await new Promise<File>((res, rej) => entry.file(res, rej)));
      else if (entry.isDirectory) {
        const r = entry.createReader();
        let batch: any[];
        do {
          batch = await new Promise((res, rej) => r.readEntries(res, rej));
          for (const b of batch) await walk(b);
        } while (batch.length);
      }
    };
    const entries = items.map((it) => (it as any).webkitGetAsEntry?.()).filter(Boolean);
    if (entries.length) for (const en of entries) await walk(en);
    else files.push(...Array.from(e.dataTransfer.files));
    startUpload(files.filter((f) => !/^\.|^thumbs\.db$|^desktop\.ini$/i.test(f.name)));
  };

  const act = async (json: any) => adminApi(`/${g.id}/photos`, { method: 'POST', json });
  const ids = Array.from(sel);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = photos.findIndex((p) => p.id === e.active.id);
    const to = photos.findIndex((p) => p.id === e.over!.id);
    const next = arrayMove(photos, from, to);
    setPhotos(next);
    await act({ action: 'reorder', ids: next.map((p) => p.id) });
  };

  const sortBy = async (mode: 'name' | 'kind') => {
    const next = [...photos].sort((a, b) =>
      mode === 'name' ? a.filename.localeCompare(b.filename, 'fr', { numeric: true }) : a.kind.localeCompare(b.kind) || a.position - b.position
    );
    setPhotos(next);
    await act({ action: 'reorder', ids: next.map((p) => p.id) });
    toast('Ordre enregistré');
  };

  const addSet = async () => {
    const name = await promptDialog({ title: 'Nouvelle section', placeholder: 'Discours, Cocktail, Vidéos…' });
    if (!name?.trim()) return;
    const j = await adminApi<{ set: GallerySet }>(`/${g.id}/sets`, { method: 'POST', json: { name } });
    setSets([...sets, j.set]);
    setSetView(j.set.id);
  };
  const renameSet = async (st: GallerySet) => {
    const name = await promptDialog({ title: 'Renommer la section', defaultValue: st.name });
    if (!name?.trim()) return;
    await adminApi(`/${g.id}/sets`, { method: 'PATCH', json: { setId: st.id, name } });
    setSets(sets.map((x) => (x.id === st.id ? { ...x, name } : x)));
  };
  const deleteSet = async (st: GallerySet) => {
    if (!(await confirmDialog({ title: `Supprimer la section « ${st.name} » ?`, message: 'Ses fichiers sont conservés, sans section.', confirmLabel: 'Supprimer', tone: 'danger' }))) return;
    await adminApi(`/${g.id}/sets?setId=${st.id}`, { method: 'DELETE' });
    setSets(sets.filter((x) => x.id !== st.id));
    setPhotos(photos.map((p) => (p.set_id === st.id ? { ...p, set_id: null } : p)));
    setSetView('all');
  };

  const moveTo = async (setId: string | null) => {
    await act({ action: 'update', updates: ids.map((id) => ({ id, set_id: setId })) });
    setPhotos(photos.map((p) => (sel.has(p.id) ? { ...p, set_id: setId } : p)));
    setSel(new Set());
    toast('Déplacé');
  };
  const setHidden = async (hidden: boolean) => {
    await act({ action: 'update', updates: ids.map((id) => ({ id, hidden })) });
    setPhotos(photos.map((p) => (sel.has(p.id) ? { ...p, hidden } : p)));
    setSel(new Set());
  };
  const remove = async () => {
    if (!(await confirmDialog({ title: `Supprimer ${ids.length} fichier${ids.length > 1 ? 's' : ''} ?`, message: 'Les fichiers sont effacés du stockage. Action définitive.', confirmLabel: 'Supprimer', tone: 'danger' })))
      return;
    await act({ action: 'delete', ids });
    setSel(new Set());
    await onChanged();
    toast('Supprimé');
  };
  const runRegen = async () => {
    if (!wm || !wmKey) return;
    setRegen({ done: 0, total: staleWm });
    const r = await regenerateWatermarks(g.id, photos, wm, wmKey, (done, total) => setRegen({ done, total }));
    setRegen(null);
    await onChanged();
    toast(r.errors ? `${r.errors} aperçu(s) en erreur` : 'Aperçus filigranés à jour');
  };

  const pct = prog ? (prog.bytesTotal ? (prog.bytesDone / prog.bytesTotal) * 100 : (prog.done / Math.max(1, prog.total)) * 100) : 0;
  const counts = { image: 0, video: 0, file: 0 } as Record<string, number>;
  photos.forEach((p) => counts[p.kind]++);

  return (
    <div className={s.edCols}>
      <div>
        <div className={s.card2} style={{ padding: 10 }}>
          <div className={s.sideTitle} style={{ paddingTop: 4 }}>
            Sections
            <button onClick={addSet}>
              <Plus size={14} />
            </button>
          </div>
          <button className={s.nav} aria-current={setView === 'all'} onClick={() => setSetView('all')}>
            <Layers size={15} /> <span className={s.label}>Tout</span>
            <span className={s.n}>{photos.length}</span>
          </button>
          {sets.length ? (
            <button className={s.nav} aria-current={setView === NO_SET} onClick={() => setSetView(NO_SET)}>
              <span className={s.label}>Sans section</span>
              <span className={s.n}>{photos.filter((p) => !p.set_id).length}</span>
            </button>
          ) : null}
          {sets.map((st) => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
              <button className={s.nav} aria-current={setView === st.id} onClick={() => setSetView(st.id)}>
                <span className={s.label}>{st.name}</span>
                <span className={s.n}>{photos.filter((p) => p.set_id === st.id).length}</span>
              </button>
              {setView === st.id ? (
                <>
                  <AdminButton size="sm" variant="ghost" iconOnly aria-label="Renommer" onClick={() => renameSet(st)}>
                    <Pencil size={13} />
                  </AdminButton>
                  <AdminButton size="sm" variant="ghost" iconOnly aria-label="Supprimer" onClick={() => deleteSet(st)}>
                    <Trash2 size={13} />
                  </AdminButton>
                </>
              ) : null}
            </div>
          ))}
        </div>
        <StorageMeter used={used + (prog ? prog.bytesDone : 0)} live={!!prog && prog.done < prog.total} />
        <p className={s.muted} style={{ padding: '0 4px' }}>
          Cette galerie : {formatBytes(g.stored_bytes)} · {counts.image} photo(s), {counts.video} vidéo(s), {counts.file} document(s)
        </p>
      </div>

      <div style={{ minWidth: 0 }}>
        {staleWm > 0 ? (
          <div className={s.notice}>
            <Droplets size={15} style={{ verticalAlign: -3 }} /> {staleWm} aperçu{staleWm > 1 ? 's' : ''} à filigraner avec « {wm?.name} ».{' '}
            {regen ? (
              <b>
                {regen.done} / {regen.total}…
              </b>
            ) : (
              <AdminButton size="sm" variant="primary" leadingIcon={<RefreshCw size={14} />} onClick={runRegen}>
                Générer maintenant
              </AdminButton>
            )}
          </div>
        ) : null}

        <div
          className={s.drop}
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <div className={s.dropIcon}>
            <Upload size={20} />
          </div>
          <div className={s.dropText}>
            {prog && (prog.done < prog.total || prog.errors.length) ? (
              <>
                <b>
                  {prog.done < prog.total ? `Envoi — ${prog.done} / ${prog.total}` : `Terminé — ${prog.total - prog.errors.length} / ${prog.total}`}
                </b>
                <small>
                  {formatBytes(prog.bytesDone)} / {formatBytes(prog.bytesTotal)} · {prog.current}
                </small>
                <div className={s.progressBar}>
                  <i style={{ width: `${pct}%` }} />
                </div>
                {prog.errors.length ? (
                  <div className={s.errors}>
                    {prog.errors.map((e, i) => (
                      <div key={i}>
                        {e.name} : {e.error}
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <b>Glissez photos, vidéos ou documents ici</b>
                <small>
                  Photos jusqu’à 40 Mo (aperçus générés automatiquement{wm ? ', filigrane inclus' : ''}) · vidéos et documents jusqu’à 2 Go
                  {setView !== 'all' && setView !== NO_SET ? ` · ajoutés à « ${sets.find((x) => x.id === setView)?.name} »` : ''}
                </small>
              </>
            )}
          </div>
          {prog && prog.done < prog.total ? (
            <AdminButton size="sm" variant="ghost" onClick={() => (cancel.current.cancelled = true)}>
              Arrêter
            </AdminButton>
          ) : (
            <AdminButton size="sm" variant="secondary" leadingIcon={<Plus size={14} />} onClick={() => input.current?.click()} disabled={!r2}>
              Ajouter
            </AdminButton>
          )}
          <input
            ref={input}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const f = Array.from(e.target.files || []);
              e.target.value = '';
              startUpload(f);
            }}
          />
        </div>

        {sel.size ? (
          <div className={s.selBar}>
            <b style={{ marginRight: 6 }}>{sel.size} sélectionné(s)</b>
            <select className={s.select} value="" onChange={(e) => e.target.value && moveTo(e.target.value === NO_SET ? null : e.target.value)} aria-label="Déplacer vers">
              <option value="">Déplacer vers…</option>
              <option value={NO_SET}>Sans section</option>
              {sets.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <AdminButton size="sm" variant="ghost" leadingIcon={<EyeOff size={14} />} onClick={() => setHidden(true)}>
              Masquer
            </AdminButton>
            <AdminButton size="sm" variant="ghost" leadingIcon={<Eye size={14} />} onClick={() => setHidden(false)}>
              Afficher
            </AdminButton>
            {sel.size === 1 && photos.find((p) => p.id === ids[0])?.kind === 'image' ? (
              <AdminButton
                size="sm"
                variant="ghost"
                leadingIcon={<Star size={14} />}
                onClick={() => {
                  onCover(ids[0]);
                  setSel(new Set());
                }}
              >
                Couverture
              </AdminButton>
            ) : null}
            <AdminButton size="sm" variant="dangerGhost" leadingIcon={<Trash2 size={14} />} onClick={remove}>
              Supprimer
            </AdminButton>
            <span className={s.spacer} />
            <AdminButton size="sm" variant="ghost" onClick={() => setSel(new Set(visible.map((p) => p.id)))}>
              Tout
            </AdminButton>
            <AdminButton size="sm" variant="ghost" iconOnly aria-label="Désélectionner" onClick={() => setSel(new Set())}>
              <X size={14} />
            </AdminButton>
          </div>
        ) : visible.length ? (
          <div className={s.filters} style={{ marginBottom: 12 }}>
            <span className={s.muted}>
              {visible.length} fichier(s) · cliquez pour sélectionner{setView === 'all' ? ', glissez pour réordonner' : ''}
            </span>
            <span className={s.spacer} />
            <AdminButton size="sm" variant="ghost" onClick={() => sortBy('name')}>
              Trier par nom
            </AdminButton>
            <AdminButton size="sm" variant="ghost" onClick={() => sortBy('kind')}>
              Photos, puis vidéos, puis documents
            </AdminButton>
          </div>
        ) : null}

        {visible.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={visible.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className={s.pgrid}>
                {visible.map((p) => (
                  <SortableTile
                    key={p.id}
                    p={p}
                    selected={sel.has(p.id)}
                    isCover={g.cover_photo_id === p.id}
                    disabled={setView !== 'all' || sel.size > 0}
                    onClick={() =>
                      setSel((cur) => {
                        const n = new Set(cur);
                        n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                        return n;
                      })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : !prog ? (
          <div className={s.empty}>
            <h3>Aucun fichier{setView !== 'all' ? ' dans cette section' : ''}</h3>
            <p>Glissez vos fichiers dans la zone ci-dessus.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Présentation ─────────────────────────────────────────────────────── */

function DesignTab({
  g,
  draft,
  setDraft,
  photos,
  previewKey,
  onCover,
  wm,
  r2,
  onUploaded,
  toast,
}: {
  g: AdminGallery;
  draft: any;
  setDraft: (d: any) => void;
  photos: AdminPhoto[];
  previewKey: number;
  onCover: (id: string) => Promise<any> | void;
  wm: Watermark | null;
  r2: boolean;
  onUploaded: () => Promise<void>;
  toast: (m: string) => void;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [uploading, setUploading] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const images = photos.filter((p) => p.kind === 'image');
  const cover = images.find((p) => p.id === g.cover_photo_id) || images[0];
  const focus = draft.design.focus || { x: 0.5, y: 0.5 };

  // Aperçu en direct : chaque changement est envoyé à la page dans l'iframe
  const live = useMemo(() => ({ type: 'cg-live', design: draft.design, intro: draft.intro || null }), [draft.design, draft.intro]);
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage(live, window.location.origin);
  }, [live]);
  useEffect(send, [send]);
  useEffect(() => {
    // La page signale qu'elle est prête (après chargement ou rechargement)
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'cg-ready') send();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [send]);

  // Couverture importée hors galerie : envoyée comme élément masqué
  const importCover = async (file: File) => {
    if (!r2) return toast('Stockage R2 non configuré');
    setUploading(true);
    const res = await uploadFiles(g.id, [file], { hidden: true, watermark: wm, wmKey: watermarkKey(wm) });
    if (res.uploadedIds[0]) {
      await onCover(res.uploadedIds[0]);
      setDraft({ ...draft, design: { ...draft.design, focus: { x: 0.5, y: 0.5 } } });
      await onUploaded();
      toast('Couverture importée — elle n’apparaît pas dans la galerie');
    } else toast(res.errors[0]?.error || 'Import impossible');
    setUploading(false);
  };

  return (
    <div className={s.designCols}>
      <div>
        <div className={s.card2}>
          <h3>Mot d’accueil</h3>
          <p>Affiché sous la couverture, après « Bonjour {(draft.client_name || '').split(' ')[0] || '…'} ». Laissez vide pour un texte sobre par défaut.</p>
          <textarea
            className={s.textarea}
            style={{ marginTop: 12 }}
            value={draft.intro || ''}
            placeholder={'Merci pour ce beau moment ! Voici vos photos, prêtes à être téléchargées en haute définition.'}
            onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
          />
        </div>
        <div className={s.card2}>
          <h3>Style</h3>
          <div className={s.stack}>
            <DesignFields value={draft.design} onChange={(v) => setDraft({ ...draft, design: v })} />
          </div>
        </div>
        <div className={s.card2}>
          <h3>Photo de couverture</h3>
          <p>
            Une photo de la galerie (onglet Fichiers → sélection → Couverture), ou une image importée qui n’apparaîtra pas dans la galerie. Cliquez sur
            l’image pour placer le point d’intérêt.
          </p>
          <div className={s.btnRow} style={{ marginTop: 10, marginBottom: 4 }}>
            <AdminButton size="sm" variant="secondary" leadingIcon={<Upload size={14} />} loading={uploading} onClick={() => coverInput.current?.click()}>
              Importer une image de couverture
            </AdminButton>
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) importCover(f);
              }}
            />
          </div>
          {cover ? (
            <div
              className={s.focusPick}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = Math.round(((e.clientX - r.left) / r.width) * 100) / 100;
                const y = Math.round(((e.clientY - r.top) / r.height) * 100) / 100;
                setDraft({ ...draft, design: { ...draft.design, focus: { x, y } } });
              }}
            >
              <img src={cover.thumb_url} alt="" />
              <span className={s.focusDot} style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} />
            </div>
          ) : (
            <p className={s.muted}>Ajoutez des photos pour choisir une couverture.</p>
          )}
          {cover && g.cover_photo_id !== cover.id ? (
            <AdminButton size="sm" variant="secondary" onClick={() => onCover(cover.id)}>
              Utiliser cette photo
            </AdminButton>
          ) : null}
        </div>
      </div>
      <div className={s.preview} data-device={device}>
        <div className={s.previewBar}>
          Aperçu en direct
          {JSON.stringify(pick(g).design) !== JSON.stringify(draft.design) || (g.intro || '') !== (draft.intro || '') ? ' — non enregistré' : ''}
          <span className={s.spacer} />
          <div className={s.seg}>
            <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} aria-label="Ordinateur">
              <Monitor size={14} />
            </button>
            <button aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} aria-label="Mobile">
              <Smartphone size={14} />
            </button>
          </div>
        </div>
        <iframe ref={frame} key={previewKey} src={previewLink(g)} title="Aperçu de la galerie" onLoad={send} />
      </div>
    </div>
  );
}

/* ── Réglages ─────────────────────────────────────────────────────────── */

function SettingsTab({
  g,
  draft,
  setDraft,
  meta,
  patchNow,
  toast,
  onTemplates,
}: {
  g: AdminGallery;
  draft: any;
  setDraft: (d: any) => void;
  meta: { folders: Folder[]; templates: Template[]; watermarks: Watermark[] };
  patchNow: (p: any, msg?: string) => Promise<AdminGallery | undefined>;
  toast: (m: string) => void;
  onTemplates: (t: Template[]) => void;
}) {
  const router = useRouter();
  const set = (patch: any) => setDraft({ ...draft, ...patch });
  const [tpl, setTpl] = useState(g.template_id || meta.templates[0]?.id || '');

  const copy = async (t: string, label: string) => {
    if (await copyText(t)) toast(`${label} copié`);
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <div className={s.card2}>
        <h3>Général</h3>
        <div className={s.stack}>
          <TextField label="Titre" value={draft.title} onChange={(v) => set({ title: v })} />
          <div className={s.row2}>
            <TextField label="Client" value={draft.client_name || ''} onChange={(v) => set({ client_name: v })} />
            <TextField label="E-mail du client" type="email" value={draft.client_email || ''} onChange={(v) => set({ client_email: v })} />
          </div>
          <div className={s.row2}>
            <div>
              <span className={s.lbl}>Date de l’évènement</span>
              <div className={s.field}>
                <input type="date" value={draft.event_date || ''} onChange={(e) => set({ event_date: e.target.value || null })} />
              </div>
            </div>
            <FolderSelect value={draft.folder_id} folders={meta.folders} onChange={(v) => set({ folder_id: v })} />
          </div>
          <TextField
            label="Adresse"
            value={draft.slug}
            onChange={(v) => set({ slug: slugify(v) })}
            hint={`${galleryLink({ ...g, slug: draft.slug } as AdminGallery)} — changer l’adresse casse les liens déjà envoyés.`}
          />
          <TagInput label="Tags" value={draft.tags || []} onChange={(tags) => set({ tags })} placeholder="corporate, portraits…" />
        </div>
      </div>

      <div className={s.card2}>
        <h3>
          <Lock size={16} /> Accès
        </h3>
        <div className={s.stack}>
          <AccessFields mode={draft.access_mode} magic={draft.magic_link_enabled} emailGate={draft.email_gate} onChange={(p) => set(p)} />
          {draft.access_mode === 'password' ? (
            <div>
              <span className={s.lbl}>Mot de passe</span>
              <div className={s.field}>
                <input data-mono="true" value={draft.password || ''} onChange={(e) => set({ password: e.target.value })} />
                <AdminButton size="sm" variant="ghost" leadingIcon={<RefreshCw size={14} />} onClick={() => patchNow({ regenerate_password: true }, 'Nouveau mot de passe — anciens accès révoqués')}>
                  Générer
                </AdminButton>
                <AdminButton size="sm" variant="secondary" leadingIcon={<Copy size={14} />} onClick={() => copy(draft.password || '', 'Mot de passe')}>
                  Copier
                </AdminButton>
              </div>
              <p className={s.muted} style={{ margin: '6px 0 0' }}>
                Changer le mot de passe ferme aussi tous les accès déjà ouverts et renouvelle le lien magique.
              </p>
            </div>
          ) : null}
          {g.magic_token && g.access_mode === 'password' ? (
            <div className={s.inline}>
              <div>
                <span className={s.lbl}>Lien magique</span>
                <span className={s.mono} onClick={() => copy(galleryLink(g, true), 'Lien magique')}>
                  {galleryLink(g, true)} <Copy size={12} />
                </span>
              </div>
              <AdminButton size="sm" variant="ghost" leadingIcon={<KeyRound size={14} />} onClick={() => patchNow({ revoke: true }, 'Accès révoqués, nouveau lien magique')}>
                Révoquer les accès
              </AdminButton>
            </div>
          ) : null}
          <div>
            <span className={s.lbl}>Expiration</span>
            <div className={s.inline}>
              <div className={s.field}>
                <input
                  type="date"
                  value={draft.expires_at ? draft.expires_at.slice(0, 10) : ''}
                  onChange={(e) => set({ expires_at: e.target.value ? new Date(e.target.value + 'T23:59:00').toISOString() : null })}
                />
              </div>
              {draft.expires_at ? (
                <AdminButton size="sm" variant="ghost" onClick={() => set({ expires_at: null })}>
                  Jamais
                </AdminButton>
              ) : null}
            </div>
            <p className={s.muted} style={{ margin: '6px 0 0' }}>
              Après cette date, le client voit « galerie plus disponible ». Vous pouvez la prolonger à tout moment.
            </p>
          </div>
        </div>
      </div>

      <div className={s.card2}>
        <h3>
          <Download size={16} /> Téléchargement
        </h3>
        <p>Réglé pour cette galerie uniquement.</p>
        <div className={s.stack}>
          <DownloadFields value={draft.download} onChange={(v) => set({ download: v })} />
          {draft.download.enabled && draft.download.pin ? (
            <div>
              <span className={s.lbl}>PIN</span>
              <div className={s.field} style={{ maxWidth: 320 }}>
                <input data-mono="true" value={draft.download_pin || ''} placeholder="Généré à l’enregistrement" onChange={(e) => set({ download_pin: e.target.value.replace(/\D/g, '').slice(0, 8) })} />
                <AdminButton size="sm" variant="ghost" onClick={() => patchNow({ regenerate_pin: true }, 'Nouveau PIN')}>
                  Générer
                </AdminButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={s.card2}>
        <h3>
          <Droplets size={16} /> Filigrane et favoris
        </h3>
        <div className={s.stack}>
          <WatermarkSelect value={draft.watermark_id} watermarks={meta.watermarks} onChange={(v) => set({ watermark_id: v })} />
          <FavoritesFields value={draft.favorites} onChange={(v) => set({ favorites: v })} />
        </div>
      </div>

      <div className={s.card2}>
        <h3>
          <Share2 size={16} /> Message de partage
        </h3>
        <p>
          Variables : {'{client}'} {'{titre}'} {'{lien}'} {'{motdepasse}'} {'{motdepasse_ligne}'} {'{expiration_ligne}'} {'{pin}'}
        </p>
        <textarea className={s.textarea} style={{ marginTop: 10 }} value={draft.share_message || ''} placeholder={DEFAULT_SHARE_MESSAGE} onChange={(e) => set({ share_message: e.target.value })} />
      </div>

      <div className={s.card2}>
        <h3>
          <Layers size={16} /> Modèles
        </h3>
        {g.template_id && meta.templates.some((t) => t.id === g.template_id) ? (
          <p>
            Créée avec le modèle « {meta.templates.find((t) => t.id === g.template_id)?.name} ».
          </p>
        ) : null}
        <div className={s.stack}>
          <div className={s.inline}>
            <SelectField label="Modèle" value={tpl} onChange={setTpl} options={meta.templates.map((t) => ({ value: t.id, label: t.name }))} />
            <AdminButton
              variant="secondary"
              onClick={async () => {
                if (await confirmDialog({ title: 'Appliquer ce modèle à la galerie ?', message: 'Accès, téléchargement, filigrane, favoris et présentation seront remplacés.', confirmLabel: 'Appliquer' }))
                  await patchNow({ apply_template: tpl }, 'Modèle appliqué');
              }}
            >
              Appliquer à la galerie
            </AdminButton>
            <AdminButton
              variant="secondary"
              leadingIcon={<RefreshCw size={14} />}
              onClick={async () => {
                if (JSON.stringify(pick(g)) !== JSON.stringify(draft)) return toast('Enregistrez d’abord vos modifications');
                const t = meta.templates.find((x) => x.id === tpl);
                if (!t) return;
                if (
                  !(await confirmDialog({
                    title: `Mettre à jour « ${t.name} » ?`,
                    message: 'Le modèle reprend les réglages actuels de cette galerie (accès, téléchargement, filigrane, favoris, présentation, message, tags). Les galeries existantes ne changent pas.',
                    confirmLabel: 'Mettre à jour le modèle',
                  }))
                )
                  return;
                const j = await adminApi<{ template: Template }>('/templates', { method: 'PATCH', json: { id: t.id, fromGalleryId: g.id } });
                onTemplates(meta.templates.map((x) => (x.id === t.id ? j.template : x)));
                toast(`Modèle « ${t.name} » mis à jour`);
              }}
            >
              Mettre à jour le modèle avec ces réglages
            </AdminButton>
          </div>
          <div>
            <AdminButton
              variant="ghost"
              leadingIcon={<Plus size={14} />}
              onClick={async () => {
                const name = await promptDialog({ title: 'Enregistrer comme modèle', label: 'Nom du modèle', defaultValue: `Comme « ${g.title} »` });
                if (!name?.trim()) return;
                const j = await adminApi<{ template: Template }>('/templates', { method: 'POST', json: { name, fromGalleryId: g.id } });
                onTemplates([...meta.templates, j.template]);
                toast('Modèle créé');
              }}
            >
              Enregistrer ces réglages comme nouveau modèle
            </AdminButton>
          </div>
        </div>
      </div>

      <div className={s.card2}>
        <h3 style={{ color: 'var(--adm-danger)' }}>
          <Trash2 size={16} /> Supprimer
        </h3>
        <div className={s.btnRow}>
          <AdminButton
            variant="secondary"
            onClick={async () => {
              if (!(await confirmDialog({ title: 'Mettre la galerie à la corbeille ?', message: 'Le lien cesse de fonctionner. Restauration possible depuis la corbeille.', confirmLabel: 'Mettre à la corbeille', tone: 'danger' })))
                return;
              await adminApi(`/${g.id}`, { method: 'DELETE' });
              router.push('/admin/galeries');
            }}
          >
            Mettre à la corbeille
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

/* ── Activité ─────────────────────────────────────────────────────────── */

const EVENT_LABEL: Record<string, string> = {
  view: 'Visite',
  unlock: 'Accès ouvert',
  unlock_fail: 'Mot de passe erroné',
  download_photo: 'Téléchargement',
  download_zip: 'Téléchargement ZIP',
  favorite: 'Favori',
};

function ActivityTab({ g, toast }: { g: AdminGallery; toast: (m: string) => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    adminApi(`/${g.id}/activity`).then(setData).catch((e) => toast(e.message));
  }, [g.id, toast]);

  if (!data) return <div className={s.empty}>Chargement…</div>;
  const c = data.counts || {};
  return (
    <div style={{ maxWidth: 980 }}>
      <div className={s.kpis}>
        <div className={s.kpi}>
          <b>{g.view_count}</b>
          <span>Visites</span>
        </div>
        <div className={s.kpi}>
          <b>{data.visitors.length}</b>
          <span>Visiteurs identifiés</span>
        </div>
        <div className={s.kpi}>
          <b>{g.download_count}</b>
          <span>Téléchargements</span>
        </div>
        <div className={s.kpi}>
          <b>{c.favorite || 0}</b>
          <span>Favoris ajoutés</span>
        </div>
        <div className={s.kpi}>
          <b>{g.first_viewed_at ? fmtDate(g.first_viewed_at) : '—'}</b>
          <span>Première ouverture</span>
        </div>
        <div className={s.kpi}>
          <b style={{ color: c.unlock_fail ? 'var(--adm-warning)' : undefined }}>{c.unlock_fail || 0}</b>
          <span>Mots de passe erronés</span>
        </div>
      </div>

      {data.visitors.length ? (
        <div className={s.card2}>
          <h3>Visiteurs et sélections</h3>
          <div className={s.tableWrap} style={{ marginTop: 12 }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>E-mail</th>
                  <th>Favoris</th>
                  <th>Depuis</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.visitors.map((v: any) => (
                  <tr key={v.id} style={{ cursor: 'default' }}>
                    <td>{v.name || '—'}</td>
                    <td>{v.email}</td>
                    <td>{v.favorites.length}</td>
                    <td>{fmtDate(v.created_at, true)}</td>
                    <td>
                      {v.favorites.length ? (
                        <AdminButton
                          size="sm"
                          variant="ghost"
                          leadingIcon={<Copy size={13} />}
                          onClick={async () => {
                            await copyText(v.favorites.join('\n'));
                            toast(`${v.favorites.length} noms de fichiers copiés`);
                          }}
                        >
                          Copier la sélection
                        </AdminButton>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.muted}>« Copier la sélection » donne la liste des fichiers, à coller dans Lightroom (filtre par nom) pour la retouche.</p>
        </div>
      ) : null}

      <div className={s.card2}>
        <h3>Journal</h3>
        {data.events.length ? (
          <ul className={s.log} style={{ marginTop: 10 }}>
            {data.events.map((e: any) => (
              <li key={e.id}>
                <time>{fmtDate(e.created_at, true)}</time>
                <span>
                  <b>{EVENT_LABEL[e.type] || e.type}</b>
                  {e.filename ? ` · ${e.filename}` : ''}
                  {e.meta?.count ? ` · ${e.meta.count} fichier(s)` : ''}
                  {e.meta?.size ? ` · ${e.meta.size === 'original' ? 'HD' : 'web'}` : ''}
                  {e.meta?.via === 'magic' ? ' · lien magique' : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucune activité pour l’instant.</p>
        )}
      </div>
    </div>
  );
}
