"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, Copy, FileSpreadsheet, FileText, Film, FolderOpen, Hash, Plus, Trash2, Type, Upload, Wand2, X } from 'lucide-react';
import { AdminButton, AdminModal, SelectField, TextField, ToggleField, confirmDialog } from '..';
import {
  formatBytes,
  mediaKindOf,
  slugify,
  watermarkKey,
  type AdminGallery,
  type Template,
  type Folder,
  type Watermark,
} from '../../../lib/clientGalleries/types';
import { adminApi, copyTable, copyText, downloadTextFile } from './api';
import { exifDate } from './exif';
import { folderOptions, folderPath, galleriesCsv, galleryLink } from './shared';
import { uploadFiles, type UploadProgress } from './uploader';
import s from './cg.module.css';

/**
 * Import en masse : toutes les photos d'un coup, regroupées en autant de
 * galeries que nécessaire, créées et publiées en une seule fois.
 *
 * 1. Déposer les fichiers (à plat, sans organisation préalable).
 * 2. Former les groupes : sélection manuelle, ou automatique par pause
 *    entre deux prises de vue (EXIF) ou par nom de fichier.
 * 3. Nommer chaque groupe (= titre et URL de la galerie) et choisir son modèle.
 * 4. Créer : galeries publiées, fichiers envoyés, puis liste liens + mots de
 *    passe prête à exporter.
 */

type Item = { id: string; file: File; dir: string; kind: 'image' | 'video' | 'file'; thumb: string | null; date: number | null; group: string | null };
type Group = { id: string; name: string; templateId: string; color: string };

const COLORS = ['#2f6b45', '#9a6314', '#3b5ba5', '#a33b6b', '#2a8a8a', '#7a4fb5', '#b4342a', '#5b7a1f', '#c06a2b', '#3d6f8f'];
const UNASSIGNED = '__none__';

let seq = 0;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Vignette légère (240 px) pour ne pas décoder 1 000 photos en pleine taille. */
async function makeThumb(file: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file, { resizeWidth: 240, resizeQuality: 'medium', imageOrientation: 'from-image' } as any);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    bmp.close?.();
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.7));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

/** « DUPONT_Marie_012.jpg » → « DUPONT_Marie » : préfixe commun d'une série. */
function namePrefix(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[\s_\-.(]*\d+\)?$/, '')
      .replace(/[\s_\-.]+$/, '')
      .trim() || name.replace(/\.[^.]+$/, '')
  );
}

/** Parcourt un dossier déposé en gardant le dossier parent de chaque fichier. */
async function readEntries(entry: any, out: { file: File; dir: string }[], dir = '') {
  if (entry.isFile) out.push({ file: await new Promise<File>((res, rej) => entry.file(res, rej)), dir });
  else if (entry.isDirectory) {
    const r = entry.createReader();
    let batch: any[];
    do {
      batch = await new Promise((res, rej) => r.readEntries(res, rej));
      for (const b of batch) await readEntries(b, out, entry.name);
    } while (batch.length);
  }
}

const NEW_FOLDER = '__new__';

export default function BulkImport({
  templates,
  watermarks,
  folders,
  defaultFolderId,
  onClose,
  onDone,
}: {
  templates: Template[];
  watermarks: Watermark[];
  folders: Folder[];
  defaultFolderId?: string | null;
  onClose: () => void;
  onDone: (folderId: string | null) => void;
}) {
  const defaultTpl = (templates.find((t) => t.is_default) || templates[0])?.id || '';
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [tpl, setTpl] = useState(defaultTpl);
  const [publish, setPublish] = useState(true);
  // Dossier de destination : existant, nouveau (nom saisi) ou aucun
  const [folderChoice, setFolderChoice] = useState<string>(defaultFolderId || '');
  const [folder, setFolder] = useState('');
  const [createdFolderId, setCreatedFolderId] = useState<string | null>(null);
  const [selName, setSelName] = useState('');
  const [date, setDate] = useState('');
  const [gapMin, setGapMin] = useState(2);
  const [perGroup, setPerGroup] = useState(6);
  const [over, setOver] = useState(false);
  const [phase, setPhase] = useState<'edit' | 'run' | 'done'>('edit');
  const [run, setRun] = useState<{ gi: number; gt: number; name: string; prog: UploadProgress | null }>({ gi: 0, gt: 0, name: '', prog: null });
  const [results, setResults] = useState<(AdminGallery & { files: number })[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cancelled = useRef({ cancelled: false });

  // Libère les vignettes à la fermeture
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb)), []);

  /* ── Ajout de fichiers : vignettes + dates EXIF en tâche de fond ── */
  const addFiles = useCallback(async (input: { file: File; dir: string }[]) => {
    const fresh: Item[] = input
      .filter(({ file }) => !/^\.|^thumbs\.db$|^desktop\.ini$/i.test(file.name))
      .sort((a, b) => a.dir.localeCompare(b.dir, 'fr', { numeric: true }) || a.file.name.localeCompare(b.file.name, 'fr', { numeric: true }))
      .map(({ file, dir }) => ({ id: uid(), file, dir, kind: mediaKindOf(file.type, file.name), thumb: null, date: null, group: null }));
    if (!fresh.length) return;
    setItems((cur) => [...cur, ...fresh]);
    let cursor = 0;
    const worker = async () => {
      while (cursor < fresh.length) {
        const it = fresh[cursor++];
        const [thumb, d] = await Promise.all([it.kind === 'image' ? makeThumb(it.file) : Promise.resolve(null), exifDate(it.file)]);
        setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, thumb, date: d } : x)));
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  }, []);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const entries = Array.from(e.dataTransfer.items || [])
      .map((it) => (it as any).webkitGetAsEntry?.())
      .filter(Boolean);
    const files: { file: File; dir: string }[] = [];
    if (entries.length) for (const en of entries) await readEntries(en, files);
    else files.push(...Array.from(e.dataTransfer.files || []).map((file) => ({ file, dir: '' })));
    addFiles(files);
  };

  /* ── Vues ── */
  const groupOf = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const it of items) c.set(it.group || UNASSIGNED, (c.get(it.group || UNASSIGNED) || 0) + 1);
    return c;
  }, [items]);
  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((it) => (it.group || UNASSIGNED) === filter)),
    [items, filter]
  );
  const unassigned = counts.get(UNASSIGNED) || 0;

  /* ── Sélection ── */
  const click = (id: string, e: React.MouseEvent) => {
    setSel((cur) => {
      const next = new Set(cur);
      if (e.shiftKey && last) {
        const ids = visible.map((x) => x.id);
        const [a, b] = [ids.indexOf(last), ids.indexOf(id)].sort((x, y) => x - y);
        if (a >= 0 && b >= 0) ids.slice(a, b + 1).forEach((x) => next.add(x));
      } else next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setLast(id);
  };

  /* ── Groupes ── */
  const newGroup = (name?: string, color?: string): Group => ({
    id: uid(),
    name: name || `Galerie ${groups.length + 1}`,
    templateId: tpl,
    color: color || COLORS[groups.length % COLORS.length],
  });
  // Nom proposé pour la sélection : préfixe commun des fichiers, sinon « Galerie N »
  const suggestedName = useMemo(() => {
    const prefixes = new Set(items.filter((i) => sel.has(i.id)).map((i) => namePrefix(i.file.name)));
    return prefixes.size === 1 ? Array.from(prefixes)[0].replace(/[_-]+/g, ' ') : `Galerie ${groups.length + 1}`;
  }, [items, sel, groups.length]);
  const groupFromSelection = () => {
    if (!sel.size) return;
    const g = newGroup(selName.trim() || suggestedName);
    setGroups((gs) => [...gs, g]);
    setItems((cur) => cur.map((i) => (sel.has(i.id) ? { ...i, group: g.id } : i)));
    setSel(new Set());
    setSelName('');
  };
  const addSelectionTo = (gid: string) => {
    setItems((cur) => cur.map((i) => (sel.has(i.id) ? { ...i, group: gid } : i)));
    setSel(new Set());
  };
  const unassign = () => {
    setItems((cur) => cur.map((i) => (sel.has(i.id) ? { ...i, group: null } : i)));
    setSel(new Set());
  };
  const removeGroup = (gid: string) => {
    setGroups((gs) => gs.filter((g) => g.id !== gid));
    setItems((cur) => cur.map((i) => (i.group === gid ? { ...i, group: null } : i)));
    if (filter === gid) setFilter('all');
  };
  const patchGroup = (gid: string, patch: Partial<Group>) => setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, ...patch } : g)));

  const confirmRegroup = async () =>
    !groups.length ||
    (await confirmDialog({ title: 'Refaire tous les groupes ?', message: 'Les groupes actuels seront remplacés.', confirmLabel: 'Regrouper' }));

  /** Une personne = une rafale : nouvelle galerie dès qu'une pause dépasse le seuil. */
  const autoByPause = async () => {
    if (!(await confirmRegroup())) return;
    const withDate = items.filter((i) => i.date);
    if (withDate.length < items.length * 0.6) {
      await confirmDialog({
        title: 'Dates de prise de vue manquantes',
        message: `Seuls ${withDate.length} fichiers sur ${items.length} ont une date EXIF (JPEG avec métadonnées). Essayez le regroupement par nom de fichier.`,
        confirmLabel: 'Compris',
      });
      if (!withDate.length) return;
    }
    const sorted = [...items].sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity) || a.file.name.localeCompare(b.file.name, 'fr', { numeric: true }));
    const gs: Group[] = [];
    const assign = new Map<string, string>();
    let prev: number | null = null;
    for (const it of sorted) {
      if (!it.date) continue;
      if (prev === null || it.date - prev > gapMin * 60000) {
        gs.push({ id: uid(), name: `Galerie ${gs.length + 1}`, templateId: tpl, color: COLORS[gs.length % COLORS.length] });
      }
      assign.set(it.id, gs[gs.length - 1].id);
      prev = it.date;
    }
    setGroups(gs);
    setItems(sorted.map((i) => ({ ...i, group: assign.get(i.id) || null })));
    setFilter('all');
    setSel(new Set());
  };

  /** Une galerie toutes les N photos, dans l'ordre de prise de vue (ou de nom). */
  const autoByCount = async () => {
    if (!(await confirmRegroup())) return;
    const n = Math.max(1, perGroup);
    const sorted = [...items].sort(
      (a, b) => (a.date ?? Infinity) - (b.date ?? Infinity) || a.file.name.localeCompare(b.file.name, 'fr', { numeric: true })
    );
    const gs: Group[] = [];
    const next = sorted.map((it, i) => {
      if (i % n === 0) gs.push({ id: uid(), name: `Galerie ${gs.length + 1}`, templateId: tpl, color: COLORS[gs.length % COLORS.length] });
      return { ...it, group: gs[gs.length - 1].id };
    });
    setGroups(gs);
    setItems(next);
    setFilter('all');
    setSel(new Set());
  };

  /** Un sous-dossier = une galerie, nommée comme le dossier (« Dupont Marie/ »…). */
  const hasDirs = items.some((i) => i.dir);
  const autoByFolder = async () => {
    if (!(await confirmRegroup())) return;
    const byDir = new Map<string, string>();
    const gs: Group[] = [];
    const next = items.map((i) => {
      if (!i.dir) return { ...i, group: null };
      if (!byDir.has(i.dir)) {
        const g = { id: uid(), name: i.dir, templateId: tpl, color: COLORS[gs.length % COLORS.length] };
        gs.push(g);
        byDir.set(i.dir, g.id);
      }
      return { ...i, group: byDir.get(i.dir)! };
    });
    setGroups(gs);
    setItems(next);
    setFilter('all');
    setSel(new Set());
  };

  const folderLabel = folderChoice === NEW_FOLDER ? folder : folderPath(folders, folderChoice) || '';

  /** Même préfixe de nom = même galerie (« DUPONT_Marie_01.jpg »…). */
  const autoByName = async () => {
    if (!(await confirmRegroup())) return;
    const byKey = new Map<string, string>();
    const gs: Group[] = [];
    const next = items.map((i) => {
      const k = namePrefix(i.file.name);
      if (!byKey.has(k)) {
        const g = { id: uid(), name: k.replace(/[_-]+/g, ' '), templateId: tpl, color: COLORS[gs.length % COLORS.length] };
        gs.push(g);
        byKey.set(k, g.id);
      }
      return { ...i, group: byKey.get(k)! };
    });
    setGroups(gs);
    setItems(next);
    setFilter('all');
    setSel(new Set());
  };

  /* ── Création ── */
  const ready = groups.filter((g) => (counts.get(g.id) || 0) > 0);
  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    ready.forEach((g) => seen.set(slugify(g.name), (seen.get(slugify(g.name)) || 0) + 1));
    return new Set(Array.from(seen.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  }, [ready]);

  const wmFor = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    const id = t?.settings?.watermark_id || (t?.settings?.watermark ? watermarks[0]?.id : null);
    return id ? watermarks.find((w) => w.id === id) || null : null;
  };

  const start = async () => {
    setPhase('run');
    setError(null);
    cancelled.current = { cancelled: false };
    try {
      const j = await adminApi<{ folderId: string | null; galleries: (AdminGallery & { key: string })[]; failed: { title: string; error: string }[] }>('/batch', {
        method: 'POST',
        json: {
          folderId: folderChoice && folderChoice !== NEW_FOLDER ? folderChoice : null,
          folderName: folderChoice === NEW_FOLDER ? folder.trim() || null : null,
          // Nouveau dossier : créé dans le dossier depuis lequel l'import a été lancé
          folderParentId: folderChoice === NEW_FOLDER ? defaultFolderId || null : null,
          eventDate: date || null,
          status: publish ? 'published' : 'draft',
          galleries: ready.map((g) => ({ key: g.id, title: g.name.trim() || 'Galerie', templateId: g.templateId })),
        },
      });
      const errs = j.failed.map((f) => `${f.title} : ${f.error}`);
      const done: (AdminGallery & { files: number })[] = [];
      for (let i = 0; i < j.galleries.length; i++) {
        const g = j.galleries[i];
        const grp = groupOf.get(g.key);
        const files = items.filter((it) => it.group === g.key).map((it) => it.file);
        done.push({ ...g, files: files.length });
        if (cancelled.current.cancelled || !grp) continue;
        setRun({ gi: i + 1, gt: j.galleries.length, name: g.title, prog: null });
        const wm = wmFor(grp.templateId);
        const res = await uploadFiles(g.id, files, {
          watermark: wm,
          wmKey: watermarkKey(wm),
          signal: cancelled.current,
          onProgress: (p) => setRun((r) => ({ ...r, prog: p })),
        });
        res.errors.forEach((e) => errs.push(`${g.title} / ${e.name} : ${e.error}`));
      }
      setCreatedFolderId(j.folderId || null);
      setResults(done);
      setErrors(errs);
      setPhase('done');
    } catch (e: any) {
      setError(e.message);
      setPhase('edit');
    }
  };

  /** Une ligne par galerie, une valeur par colonne (collage tableur ou e-mail). */
  const copyResults = () =>
    copyTable(
      ['Galerie', 'Lien', 'Mot de passe', 'Fichiers'],
      results.map((g) => [g.title, galleryLink(g), g.access_mode === 'password' ? g.password : '', g.files])
    );

  /* ── Rendu ── */
  const overall = run.gt ? ((run.gi - 1 + (run.prog && run.prog.total ? run.prog.done / run.prog.total : 0)) / run.gt) * 100 : 0;
  const totalBytes = items.reduce((a, i) => a + i.file.size, 0);

  return (
    <AdminModal
      title="Import en masse"
      subtitle="Toutes les photos d’un coup, une galerie par groupe"
      size="full"
      onClose={() => {
        if (phase === 'run') cancelled.current.cancelled = true;
        phase === 'done' ? onDone(createdFolderId) : onClose();
      }}
      disableOverlayClose
      error={error}
      footer={
        phase === 'edit' ? (
          <>
            <span className={s.muted} style={{ marginRight: 'auto' }}>
              {ready.length} galerie{ready.length > 1 ? 's' : ''} · {items.length - unassigned} fichier{items.length - unassigned > 1 ? 's' : ''}
              {unassigned && groups.length ? ` · ${unassigned} non classé${unassigned > 1 ? 's' : ''} (ignorés)` : ''}
              {duplicates.size ? ' · noms en double : un suffixe -2, -3 sera ajouté à l’URL' : ''}
            </span>
            <AdminButton variant="ghost" onClick={onClose}>
              Annuler
            </AdminButton>
            <AdminButton variant="primary" disabled={!ready.length} onClick={start} leadingIcon={<Upload size={15} />}>
              Créer {ready.length || ''} galerie{ready.length > 1 ? 's' : ''}
              {publish ? ' publiées' : ''}
            </AdminButton>
          </>
        ) : phase === 'run' ? (
          <AdminButton variant="dangerGhost" onClick={() => (cancelled.current.cancelled = true)}>
            Arrêter après la galerie en cours
          </AdminButton>
        ) : (
          <>
            <AdminButton
              variant="secondary"
              leadingIcon={copied ? <Check size={15} /> : <Copy size={15} />}
              onClick={async () => {
                if (await copyResults()) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }
              }}
            >
              {copied ? 'Copié' : 'Copier liens et mots de passe'}
            </AdminButton>
            <AdminButton
              variant="secondary"
              leadingIcon={<FileSpreadsheet size={15} />}
              onClick={() => downloadTextFile(`galeries-${slugify(folderLabel || 'import')}-${new Date().toISOString().slice(0, 10)}.csv`, galleriesCsv(results, folders))}
            >
              Exporter (CSV / Excel)
            </AdminButton>
            <AdminButton variant="primary" onClick={() => onDone(createdFolderId)}>
              Terminer
            </AdminButton>
          </>
        )
      }
    >
      {phase === 'edit' && !items.length ? (
        <div className={s.stack} style={{ marginTop: 0 }}>
          <div
            className={s.dropBig}
            data-over={over}
            style={{ padding: '70px 20px' }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <Upload size={34} />
            <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--adm-ink)' }}>Glissez toutes les photos ici</p>
            <p style={{ margin: 0, fontSize: 13 }}>Fichiers ou dossiers, sans organisation particulière. Vous ferez les groupes juste après.</p>
            <div style={{ marginTop: 16 }}>
              <AdminButton variant="primary" onClick={() => input.current?.click()}>
                Choisir les fichiers
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const f = Array.from(e.target.files || []);
          e.target.value = '';
          addFiles(f.map((file) => ({ file, dir: '' })));
        }}
      />

      {phase === 'edit' && items.length ? (
        <div className={s.bulkLayout}>
          {/* ── Colonne gauche : réglages + groupes ── */}
          <div className={s.bulkSide}>
            <div className={s.card2} style={{ marginBottom: 12 }}>
              <div className={s.stack} style={{ marginTop: 0 }}>
                <SelectField label="Modèle par défaut des nouveaux groupes" value={tpl} onChange={setTpl} options={templates.map((t) => ({ value: t.id, label: t.name }))} />
                <ToggleField label="Publier directement" hint="Les galeries sont accessibles dès leur création." checked={publish} onChange={setPublish} />
                <div className={s.row2}>
                  <div>
                    <SelectField
                      label="Ranger dans le dossier"
                      value={folderChoice}
                      onChange={setFolderChoice}
                      options={[
                        { value: '', label: 'Aucun dossier' },
                        ...folderOptions(folders),
                        { value: NEW_FOLDER, label: '+ Nouveau dossier…' },
                      ]}
                    />
                    {folderChoice === NEW_FOLDER ? (
                      <div style={{ marginTop: 8 }}>
                        <TextField value={folder} onChange={setFolder} placeholder="Nom du dossier (ex. BNP — Portraits 2026)" />
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <span className={s.lbl}>Date</span>
                    <div className={s.field}>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={s.card2} style={{ marginBottom: 12 }}>
              <h3>
                <Wand2 size={16} /> Regrouper automatiquement
              </h3>
              <div className={s.autoRows}>
                <div className={s.autoRow}>
                  <Hash size={15} />
                  <span>Une galerie toutes les</span>
                  <input className={s.autoNum} type="number" min={1} max={500} value={perGroup} onChange={(e) => setPerGroup(Math.max(1, Number(e.target.value) || 1))} />
                  <span>photos</span>
                  <AdminButton size="sm" variant="secondary" onClick={autoByCount}>
                    Appliquer
                  </AdminButton>
                </div>
                <div className={s.autoRow}>
                  <Clock size={15} />
                  <span>Nouvelle galerie après</span>
                  <input className={s.autoNum} type="number" min={1} max={120} value={gapMin} onChange={(e) => setGapMin(Math.max(1, Number(e.target.value) || 1))} />
                  <span>min de pause</span>
                  <AdminButton size="sm" variant="secondary" onClick={autoByPause}>
                    Appliquer
                  </AdminButton>
                </div>
                {hasDirs ? (
                  <div className={s.autoRow}>
                    <FolderOpen size={15} />
                    <span>Un sous-dossier = une galerie</span>
                    <AdminButton size="sm" variant="secondary" onClick={autoByFolder}>
                      Appliquer
                    </AdminButton>
                  </div>
                ) : null}
                <div className={s.autoRow}>
                  <Type size={15} />
                  <span>Par nom de fichier (DUPONT_Marie_01…)</span>
                  <AdminButton size="sm" variant="secondary" onClick={autoByName}>
                    Appliquer
                  </AdminButton>
                </div>
              </div>
              <p className={s.muted} style={{ margin: '10px 0 0', fontSize: 12 }}>
                L’ordre suit l’heure de prise de vue (EXIF), sinon le nom des fichiers. Ajustez ensuite à la main si besoin.
              </p>
            </div>

            <div className={s.card2} style={{ padding: 12 }}>
              <div className={s.sideTitle} style={{ paddingTop: 0 }}>
                Galeries à créer ({groups.length})
              </div>
              <button className={s.nav} aria-current={filter === 'all'} onClick={() => setFilter('all')}>
                <span className={s.label}>Tous les fichiers</span>
                <span className={s.n}>{items.length}</span>
              </button>
              <button className={s.nav} aria-current={filter === UNASSIGNED} onClick={() => setFilter(UNASSIGNED)}>
                <span className={s.label}>Non classés</span>
                <span className={s.n} style={{ color: unassigned ? 'var(--adm-warning)' : undefined }}>
                  {unassigned}
                </span>
              </button>
              <div className={s.groupList}>
                {groups.map((g, gi) => (
                  <div key={g.id} className={s.groupCard} data-active={filter === g.id} style={{ ['--gc' as any]: g.color }}>
                    <div className={s.groupHead}>
                      <button className={s.groupDot} onClick={() => setFilter(g.id)} title="Voir ce groupe">
                        {gi + 1}
                      </button>
                      <input
                        className={s.groupName}
                        value={g.name}
                        onChange={(e) => patchGroup(g.id, { name: e.target.value })}
                        onFocus={() => setFilter(g.id)}
                        aria-label="Nom de la galerie"
                      />
                      <span className={s.n}>{counts.get(g.id) || 0}</span>
                      <button className={s.groupX} onClick={() => removeGroup(g.id)} aria-label="Supprimer le groupe" title="Supprimer le groupe (fichiers → non classés)">
                        <X size={14} />
                      </button>
                    </div>
                    <div className={s.groupMeta}>
                      <span className={s.groupSlug} data-dup={duplicates.has(slugify(g.name))}>
                        /client/{slugify(g.name)}
                      </span>
                      <select className={s.select} style={{ height: 28, fontSize: 12 }} value={g.templateId} onChange={(e) => patchGroup(g.id, { templateId: e.target.value })} aria-label="Modèle">
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {sel.size ? (
                        <AdminButton size="sm" variant="secondary" onClick={() => addSelectionTo(g.id)}>
                          + {sel.size}
                        </AdminButton>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Colonne droite : fichiers ── */}
          <div style={{ minWidth: 0 }}>
            <div className={s.selBar} style={{ top: 0 }}>
              {sel.size ? (
                <>
                  <b style={{ whiteSpace: 'nowrap' }}>{sel.size} sélectionné(s)</b>
                  <form
                    className={s.selNameForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      groupFromSelection();
                    }}
                  >
                    <input
                      className={s.selNameInput}
                      value={selName}
                      onChange={(e) => setSelName(e.target.value)}
                      placeholder={suggestedName}
                      aria-label="Nom de la nouvelle galerie"
                      autoFocus
                    />
                    <AdminButton type="submit" size="sm" variant="primary" leadingIcon={<Plus size={14} />}>
                      Créer la galerie
                    </AdminButton>
                  </form>
                  {selName.trim() ? <span className={s.groupSlug} style={{ flex: 'none', minWidth: 0 }}>/client/{slugify(selName)}</span> : null}
                  <AdminButton size="sm" variant="ghost" onClick={unassign}>
                    Retirer du groupe
                  </AdminButton>
                  <span className={s.spacer} />
                  <AdminButton size="sm" variant="ghost" iconOnly aria-label="Désélectionner" onClick={() => setSel(new Set())}>
                    <X size={14} />
                  </AdminButton>
                </>
              ) : (
                <>
                  <span className={s.muted}>
                    Cliquez pour sélectionner, <b>Maj+clic</b> pour une plage · {items.length} fichiers · {formatBytes(totalBytes)}
                  </span>
                  <span className={s.spacer} />
                  <AdminButton size="sm" variant="ghost" onClick={() => setSel(new Set(visible.map((i) => i.id)))}>
                    Tout sélectionner
                  </AdminButton>
                  <AdminButton size="sm" variant="ghost" leadingIcon={<Plus size={14} />} onClick={() => input.current?.click()}>
                    Ajouter des fichiers
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    leadingIcon={<Trash2 size={14} />}
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Tout vider ?', message: 'Fichiers et groupes seront retirés de l’import.', confirmLabel: 'Vider', tone: 'danger' })) {
                        items.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
                        setItems([]);
                        setGroups([]);
                        setSel(new Set());
                      }
                    }}
                  >
                    Vider
                  </AdminButton>
                </>
              )}
            </div>
            <div
              className={s.bulkGrid}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              {visible.map((it) => {
                const g = it.group ? groupOf.get(it.group) : null;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={s.bulkTile}
                    data-selected={sel.has(it.id)}
                    style={g ? ({ ['--gc' as any]: g.color } as any) : undefined}
                    data-grouped={!!g}
                    onClick={(e) => click(it.id, e)}
                    title={`${it.file.name}${it.date ? ` · ${new Date(it.date).toLocaleTimeString('fr-FR')}` : ''}`}
                  >
                    {it.thumb ? (
                      <img src={it.thumb} alt="" draggable={false} />
                    ) : (
                      <span className={s.fileTile}>
                        {it.kind === 'video' ? <Film size={22} /> : it.kind === 'file' ? <FileText size={22} /> : null}
                        {it.kind !== 'image' ? it.file.name.split('.').pop() : '…'}
                      </span>
                    )}
                    {g ? <span className={s.bulkBadge}>{groups.indexOf(g) + 1}</span> : null}
                    <span className={s.bulkCheck}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {phase === 'run' ? (
        <div className={s.stack} style={{ marginTop: 0, maxWidth: 720 }}>
          <b>
            Galerie {run.gi} / {run.gt} — {run.name}
            {run.prog ? ` · ${run.prog.done} / ${run.prog.total} fichiers` : ''}
          </b>
          <div className={s.progressBar} style={{ height: 10 }}>
            <i style={{ width: `${overall}%` }} />
          </div>
          {run.prog?.current ? <p className={s.muted}>{run.prog.current}</p> : null}
          <p className={s.muted}>Gardez cet onglet ouvert : les fichiers partent directement de votre ordinateur vers le stockage.</p>
        </div>
      ) : null}

      {phase === 'done' ? (
        <div className={s.stack} style={{ marginTop: 0 }}>
          <div className={s.notice} style={{ background: 'var(--adm-success-wash)', marginBottom: 0 }}>
            <b>
              {results.length} galerie{results.length > 1 ? 's' : ''} créée{results.length > 1 ? 's' : ''}
              {publish ? ' et publiée' + (results.length > 1 ? 's' : '') : ' (brouillons)'}.
            </b>{' '}
            Copiez ou exportez la liste ci-dessous pour l’envoyer.
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Galerie</th>
                  <th>Lien</th>
                  <th>Mot de passe</th>
                  <th>Fichiers</th>
                </tr>
              </thead>
              <tbody>
                {results.map((g) => (
                  <tr key={g.id} style={{ cursor: 'default' }}>
                    <td>
                      <b>{g.title}</b>
                    </td>
                    <td>
                      <span className={s.mono} onClick={() => copyText(galleryLink(g))} title="Copier">
                        {galleryLink(g)} <Copy size={12} />
                      </span>
                    </td>
                    <td>
                      {g.access_mode === 'password' && g.password ? (
                        <span className={s.mono} onClick={() => copyText(g.password!)} title="Copier">
                          {g.password} <Copy size={12} />
                        </span>
                      ) : (
                        <span className={s.muted}>—</span>
                      )}
                    </td>
                    <td>{g.files}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.length ? (
            <div className={s.errors} style={{ maxHeight: 160 }}>
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminModal>
  );
}
