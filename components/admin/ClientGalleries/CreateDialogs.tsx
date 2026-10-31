"use client";

import React, { useMemo, useRef, useState } from 'react';
import { FolderUp, Users } from 'lucide-react';
import { AdminButton, AdminModal, SelectField, TextField, ToggleField } from '..';
import { formatBytes, slugify, watermarkKey, type AdminGallery, type Folder, type Template, type Watermark } from '../../../lib/clientGalleries/types';
import { adminApi } from './api';
import { FolderSelect } from './shared';
import { uploadFiles, type UploadProgress } from './uploader';
import s from './cg.module.css';

function templateOptions(templates: Template[]) {
  return templates.map((t) => ({ value: t.id, label: `${t.name}${t.is_default ? ' ★' : ''}` }));
}
function defaultTemplate(templates: Template[]) {
  return (templates.find((t) => t.is_default) || templates[0])?.id || '';
}

function TemplateSummary({ t }: { t?: Template }) {
  if (!t) return null;
  const st = t.settings || {};
  const dl = st.download;
  const bits = [
    { password: 'Mot de passe', link: 'Lien direct', public: 'Publique' }[st.access_mode || 'password'],
    dl?.enabled === false ? 'Téléchargement désactivé' : `Téléchargement ${(dl?.sizes || ['original']).map((x) => (x === 'original' ? 'HD' : 'web')).join(' + ')}`,
    st.watermark || st.watermark_id ? 'Filigrane' : 'Sans filigrane',
    st.favorites?.enabled ? `Favoris${st.favorites.limit ? ` (${st.favorites.limit} max)` : ''}` : null,
    st.expiry_months ? `Expire après ${st.expiry_months} mois` : 'Sans expiration',
  ].filter(Boolean);
  return (
    <p className={s.muted} style={{ marginTop: 6 }}>
      {t.description ? `${t.description} — ` : ''}
      {bits.join(' · ')}
    </p>
  );
}

/* ── Nouvelle galerie ─────────────────────────────────────────────────── */

export function NewGalleryDialog({
  templates,
  folders,
  defaultFolder,
  onClose,
  onCreated,
}: {
  templates: Template[];
  folders: Folder[];
  defaultFolder?: string | null;
  onClose: () => void;
  onCreated: (g: AdminGallery) => void;
}) {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [folder, setFolder] = useState<string | null>(defaultFolder || null);
  const [tpl, setTpl] = useState(defaultTemplate(templates));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const j = await adminApi<{ gallery: AdminGallery }>('', {
        method: 'POST',
        json: { title, client_name: client, client_email: email, event_date: date || null, folder_id: folder, template_id: tpl },
      });
      onCreated(j.gallery);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <AdminModal
      title="Nouvelle galerie"
      size="md"
      onClose={onClose}
      error={error}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Annuler
          </AdminButton>
          <AdminButton variant="primary" loading={busy} disabled={!title.trim()} onClick={create}>
            Créer et ajouter les fichiers
          </AdminButton>
        </>
      }
    >
      <div className={s.stack} style={{ marginTop: 0 }}>
        <TextField label="Titre" value={title} onChange={setTitle} placeholder="20261108 - Séminaire Kering" required />
        <p className={s.muted} style={{ marginTop: -6 }}>
          Adresse : /client/{slugify(title || 'titre')}
        </p>
        <div className={s.row2}>
          <TextField label="Client" value={client} onChange={setClient} placeholder="Nom du client" />
          <TextField label="E-mail du client" type="email" value={email} onChange={setEmail} placeholder="Pour l'envoi et l'export" />
        </div>
        <div className={s.row2}>
          <div>
            <span className={s.lbl}>Date de l'évènement</span>
            <div className={s.field}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <FolderSelect value={folder} folders={folders} onChange={setFolder} />
        </div>
        <div>
          <SelectField label="Modèle de réglages" value={tpl} onChange={setTpl} options={templateOptions(templates)} />
          <TemplateSummary t={templates.find((t) => t.id === tpl)} />
        </div>
        <p className={s.muted}>Un mot de passe est généré automatiquement. Tout reste modifiable ensuite.</p>
      </div>
    </AdminModal>
  );
}

/* ── Séance : une galerie par personne ────────────────────────────────── */

type Row = { key: string; title: string; client_name: string; client_email: string; files: File[] };

async function readEntry(entry: any, path: string, out: { path: string; file: File }[]) {
  if (entry.isFile) {
    const file: File = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ path: path + file.name, file });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    let batch: any[];
    do {
      batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      for (const e of batch) await readEntry(e, `${path}${entry.name}/`, out);
    } while (batch.length);
  }
}

function isJunk(name: string) {
  return /^\.|^thumbs\.db$|^desktop\.ini$/i.test(name);
}

/** Regroupe par premier sous-dossier sous la racine déposée. */
function groupByPerson(items: { path: string; file: File }[]): Map<string, File[]> {
  const groups = new Map<string, File[]>();
  for (const { path, file } of items) {
    if (isJunk(file.name)) continue;
    const parts = path.split('/').filter(Boolean);
    // racine/personne/fichier → personne ; personne/fichier → personne
    const person = parts.length >= 3 ? parts[1] : parts.length === 2 ? parts[0] : '';
    if (!person) continue;
    if (!groups.has(person)) groups.set(person, []);
    groups.get(person)!.push(file);
  }
  return groups;
}

function parseEmails(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[;,\t]/).map((c) => c.trim());
    const email = cells.find((c) => /@/.test(c));
    const name = cells.find((c) => c && !/@/.test(c));
    if (email && name) m.set(slugify(name), email);
  }
  return m;
}

export function SessionDialog({
  templates,
  watermarks,
  onClose,
  onDone,
}: {
  templates: Template[];
  watermarks: Watermark[];
  onClose: () => void;
  onDone: (folderId: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [tpl, setTpl] = useState(defaultTemplate(templates));
  const [rows, setRows] = useState<Row[]>([]);
  const [emails, setEmails] = useState('');
  const [over, setOver] = useState(false);
  const [publish, setPublish] = useState(true);
  const [phase, setPhase] = useState<'edit' | 'run' | 'done'>('edit');
  const [status, setStatus] = useState<{ gi: number; gt: number; prog: UploadProgress | null; errors: string[] }>({ gi: 0, gt: 0, prog: null, errors: [] });
  const [error, setError] = useState<string | null>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const cancelled = useRef({ cancelled: false });

  const totalFiles = rows.reduce((a, r) => a + r.files.length, 0);
  const totalBytes = rows.reduce((a, r) => a + r.files.reduce((b, f) => b + f.size, 0), 0);

  const setFromGroups = (groups: Map<string, File[]>, rootName?: string) => {
    if (rootName && !name) setName(rootName);
    const mail = parseEmails(emails);
    const next: Row[] = Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
      .map(([person, files]) => ({ key: person, title: person, client_name: person, client_email: mail.get(slugify(person)) || '', files }));
    setRows(next);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const items = Array.from(e.dataTransfer.items || []);
    const out: { path: string; file: File }[] = [];
    let root: string | undefined;
    for (const it of items) {
      const entry = (it as any).webkitGetAsEntry?.();
      if (!entry) continue;
      if (entry.isDirectory && items.length === 1) root = entry.name;
      await readEntry(entry, '', out);
    }
    // Plusieurs dossiers déposés directement = un dossier par personne
    const fixed = root ? out : out.map((o) => ({ ...o, path: `_/${o.path}` }));
    setFromGroups(groupByPerson(fixed), root);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const items = files.map((f) => ({ path: (f as any).webkitRelativePath || f.name, file: f }));
    const root = items[0]?.path.split('/')[0];
    setFromGroups(groupByPerson(items), root);
    e.target.value = '';
  };

  const applyEmails = (text: string) => {
    setEmails(text);
    const mail = parseEmails(text);
    setRows((rs) => rs.map((r) => ({ ...r, client_email: mail.get(slugify(r.client_name)) || r.client_email })));
  };

  const prefixTitle = (person: string) => (name.trim() ? `${name.trim()} — ${person}` : person);

  const run = async () => {
    setPhase('run');
    setError(null);
    try {
      const j = await adminApi<{ folderId: string; galleries: AdminGallery[]; failed: any[] }>('/batch', {
        method: 'POST',
        json: {
          folderName: name.trim() || 'Séance',
          eventDate: date || null,
          templateId: tpl,
          status: publish ? 'published' : 'draft',
          galleries: rows.map((r) => ({ title: prefixTitle(r.title), client_name: r.client_name, client_email: r.client_email })),
        },
      });
      const tplObj = templates.find((t) => t.id === tpl);
      const wmId = tplObj?.settings?.watermark_id || (tplObj?.settings?.watermark ? watermarks[0]?.id : null);
      const wm = wmId ? watermarks.find((w) => w.id === wmId) || null : null;
      const errs: string[] = j.failed.map((f: any) => `${f.title} : ${f.error}`);
      for (let i = 0; i < j.galleries.length; i++) {
        if (cancelled.current.cancelled) break;
        const g = j.galleries[i];
        const row = rows[i];
        setStatus((st) => ({ ...st, gi: i + 1, gt: j.galleries.length, prog: null }));
        const res = await uploadFiles(g.id, row.files, {
          watermark: wm,
          wmKey: watermarkKey(wm),
          signal: cancelled.current,
          onProgress: (p) => setStatus((st) => ({ ...st, prog: p })),
        });
        res.errors.forEach((e) => errs.push(`${row.title} / ${e.name} : ${e.error}`));
      }
      setStatus((st) => ({ ...st, errors: errs }));
      setPhase('done');
      (window as any).__cgLastFolder = j.folderId;
    } catch (e: any) {
      setError(e.message);
      setPhase('edit');
    }
  };

  const overall = useMemo(() => {
    if (!status.gt) return 0;
    const inner = status.prog && status.prog.total ? status.prog.done / status.prog.total : 0;
    return ((status.gi - 1 + inner) / status.gt) * 100;
  }, [status]);

  return (
    <AdminModal
      title="Nouvelle séance"
      subtitle="Une galerie par personne, toutes avec le même modèle"
      size="xl"
      onClose={() => {
        if (phase === 'run') cancelled.current.cancelled = true;
        onClose();
      }}
      disableOverlayClose={phase !== 'edit'}
      error={error}
      footer={
        phase === 'edit' ? (
          <>
            <AdminButton variant="ghost" onClick={onClose}>
              Annuler
            </AdminButton>
            <AdminButton variant="primary" disabled={!rows.length} onClick={run}>
              Créer {rows.length || ''} galerie{rows.length > 1 ? 's' : ''} et envoyer {totalFiles} fichier{totalFiles > 1 ? 's' : ''}
            </AdminButton>
          </>
        ) : phase === 'done' ? (
          <AdminButton variant="primary" onClick={() => onDone((window as any).__cgLastFolder || null)}>
            Voir la séance
          </AdminButton>
        ) : (
          <AdminButton variant="dangerGhost" onClick={() => (cancelled.current.cancelled = true)}>
            Arrêter après la galerie en cours
          </AdminButton>
        )
      }
    >
      {phase === 'edit' ? (
        <div className={s.stack} style={{ marginTop: 0 }}>
          <div className={s.row3}>
            <TextField label="Nom de la séance" value={name} onChange={setName} placeholder="Kering — Portraits 2026" />
            <div>
              <span className={s.lbl}>Date</span>
              <div className={s.field}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <SelectField label="Modèle" value={tpl} onChange={setTpl} options={templateOptions(templates)} />
          </div>

          <div
            className={s.dropBig}
            data-over={over}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <FolderUp size={30} />
            <p style={{ margin: '10px 0 4px', fontWeight: 600, color: 'var(--adm-ink)' }}>Glissez le dossier de la séance ici</p>
            <p style={{ margin: 0, fontSize: 13 }}>Il doit contenir un sous-dossier par personne : « Dupont Marie », « Martin Paul »…</p>
            <div style={{ marginTop: 14 }}>
              <AdminButton size="sm" variant="secondary" onClick={() => folderInput.current?.click()}>
                Choisir un dossier
              </AdminButton>
              <input ref={folderInput} type="file" hidden multiple onChange={onPick} {...({ webkitdirectory: '', directory: '' } as any)} />
            </div>
          </div>

          {rows.length ? (
            <>
              <div className={s.inline}>
                <p className={s.muted} style={{ margin: 0 }}>
                  <Users size={14} style={{ verticalAlign: -2 }} /> {rows.length} personnes · {totalFiles} fichiers · {formatBytes(totalBytes)}
                </p>
                <ToggleField label="Publier directement" checked={publish} onChange={setPublish} />
              </div>
              <div className={s.scroll}>
                <table className={s.sessionTable}>
                  <thead>
                    <tr>
                      <th>Galerie</th>
                      <th>Nom</th>
                      <th>E-mail</th>
                      <th style={{ width: 70 }}>Fichiers</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.key}>
                        <td>
                          <input value={r.title} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                        </td>
                        <td>
                          <input value={r.client_name} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, client_name: e.target.value } : x)))} />
                        </td>
                        <td>
                          <input
                            value={r.client_email}
                            placeholder="—"
                            onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, client_email: e.target.value } : x)))}
                          />
                        </td>
                        <td>{r.files.length}</td>
                        <td>
                          <AdminButton size="sm" variant="ghost" iconOnly aria-label="Retirer" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                            ×
                          </AdminButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={s.muted} style={{ margin: 0 }}>
                Titre final : « {prefixTitle(rows[0].title)} ». Un mot de passe différent est généré pour chacun.
              </p>
            </>
          ) : null}

          <div>
            <span className={s.lbl}>E-mails (facultatif) — collez une liste « Nom ; e-mail » (export RH, Excel…)</span>
            <textarea className={s.textarea} style={{ minHeight: 80 }} value={emails} onChange={(e) => applyEmails(e.target.value)} placeholder={'Dupont Marie;marie.dupont@entreprise.com\nMartin Paul;paul.martin@entreprise.com'} />
          </div>
        </div>
      ) : (
        <div className={s.stack} style={{ marginTop: 0 }}>
          <b>
            {phase === 'done' ? 'Séance créée' : `Galerie ${status.gi} / ${status.gt}`}
            {status.prog && phase === 'run' ? ` · ${status.prog.done} / ${status.prog.total} fichiers` : ''}
          </b>
          <div className={s.progressBar} style={{ height: 9 }}>
            <i style={{ width: `${phase === 'done' ? 100 : overall}%` }} />
          </div>
          {status.prog?.current && phase === 'run' ? <p className={s.muted}>{status.prog.current}</p> : null}
          {phase === 'done' ? (
            <p className={s.muted}>
              Les galeries sont dans le dossier « {name || 'Séance'} ». Exportez la liste (liens + mots de passe) depuis ce dossier.
            </p>
          ) : (
            <p className={s.muted}>Gardez cet onglet ouvert : les fichiers partent directement de votre ordinateur vers le stockage.</p>
          )}
          {status.errors.length ? (
            <div className={s.errors}>
              {status.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </AdminModal>
  );
}
