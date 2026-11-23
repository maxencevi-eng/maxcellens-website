"use client";

import React, { useRef, useState } from 'react';
import { Download, Images } from 'lucide-react';
import { formatBytes } from '../../lib/clientGalleries/types';
import ClientShell from './ClientShell';
import Brand from './Brand';
import styles from './ClientGallery.module.css';
import fs from './FolderShare.module.css';

export type FolderShareItem = {
  id: string;
  slug: string;
  title: string;
  count: number;
  bytes: number;
  cover: string | null;
  focus: { x: number; y: number } | null;
  downloadable: boolean;
  sizes: ('original' | 'web')[];
};

type ZipFile = { name: string; url: string; size: number | null };

/**
 * Dossier partagé (/partage/<slug>) : liste des galeries du dossier et
 * téléchargement de toutes leurs photos dans une seule archive, une
 * sous-archive (dossier) par galerie.
 */
export default function FolderShare({
  slug,
  title,
  date,
  items,
  logo,
}: {
  slug: string;
  title: string;
  date: string | null;
  items: FolderShareItem[];
  logo?: string | null;
}) {
  const [zip, setZip] = useState<{ done: number; total: number; label: string } | null>(null);
  const zipAbort = useRef<AbortController | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 4000);
  };

  const dl = items.filter((i) => i.downloadable);
  const photos = items.reduce((a, i) => a + i.count, 0);
  const hdBytes = dl.reduce((a, i) => a + i.bytes, 0);
  const canHd = dl.some((i) => i.sizes.includes('original'));
  const canWeb = dl.some((i) => i.sizes.includes('web'));
  const zipName = `${title.replace(/[\\/:*?"<>|]/g, '')}.zip`;

  async function downloadAll(size: 'original' | 'web') {
    // Le sélecteur d'enregistrement doit s'ouvrir pendant le geste de l'utilisateur
    let writable: any = null;
    const w = window as any;
    if (typeof w.showSaveFilePicker === 'function') {
      try {
        const handle = await w.showSaveFilePicker({
          suggestedName: zipName,
          types: [{ description: 'Archive ZIP', accept: { 'application/zip': ['.zip'] } }],
        });
        writable = await handle.createWritable();
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }

    const ctrl = new AbortController();
    zipAbort.current = ctrl;
    setZip({ done: 0, total: 0, label: 'Préparation…' });
    const res = await fetch(`/api/partage/${encodeURIComponent(slug)}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size }),
      signal: ctrl.signal,
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok || ctrl.signal.aborted) {
      try {
        await writable?.abort();
      } catch {}
      setZip(null);
      zipAbort.current = null;
      say(ctrl.signal.aborted ? 'Téléchargement arrêté' : j.error || 'Téléchargement impossible');
      return;
    }
    await runZip(j.files as ZipFile[], writable, ctrl);
    if (j.skipped?.length && !ctrl.signal.aborted) say(`${j.skipped.length} galerie(s) non incluse(s) : téléchargement non autorisé.`);
  }

  async function runZip(list: ZipFile[], writable: any, ctrl: AbortController) {
    const total = list.length;
    const totalBytes = list.reduce((a, f) => a + (f.size || 0), 0);
    if (!writable && totalBytes > 1.8e9) {
      setZip(null);
      zipAbort.current = null;
      say('Archive trop lourde pour ce navigateur : utilisez Chrome ou Edge sur ordinateur, ou téléchargez galerie par galerie.');
      return;
    }
    setZip({ done: 0, total, label: 'Préparation…' });
    try {
      const { downloadZip } = await import('client-zip');
      let done = 0;
      async function* entries() {
        for (const f of list) {
          const r = await fetch(f.url, { signal: ctrl.signal });
          if (!r.ok) throw new Error(`${f.name} : ${r.status}`);
          yield { name: f.name, input: r, ...(f.size ? { size: f.size } : {}) };
          done++;
          setZip({ done, total, label: f.name });
        }
      }
      const zipRes = downloadZip(entries());
      if (writable) {
        // Arrêt : le fichier en cours d'écriture est abandonné (pas d'archive incomplète)
        await zipRes.body!.pipeTo(writable, { signal: ctrl.signal });
      } else {
        const blob = await zipRes.blob();
        if (ctrl.signal.aborted) throw new DOMException('Annulé', 'AbortError');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      }
      setZip({ done: total, total, label: 'Terminé' });
      setTimeout(() => setZip(null), 2500);
    } catch (e: any) {
      setZip(null);
      if (ctrl.signal.aborted) say('Téléchargement arrêté');
      else say(`Le téléchargement a échoué${e?.message ? ` (${e.message})` : ''}. Réessayez.`);
    } finally {
      zipAbort.current = null;
    }
  }

  return (
    <ClientShell>
      <header className={fs.head}>
        <Brand logo={logo} className={fs.brand} />
        <h1 className={fs.title}>{title}</h1>
        <div className={fs.meta}>
          {date ? <span>{date}</span> : null}
          <span>
            {items.length} galerie{items.length > 1 ? 's' : ''} · {photos} photo{photos > 1 ? 's' : ''}
          </span>
        </div>
        {dl.length ? (
          <div className={fs.actions}>
            {canHd ? (
              <button type="button" className={fs.primary} onClick={() => downloadAll('original')} disabled={!!zip}>
                <Download size={17} /> Tout télécharger en HD
                {hdBytes ? <small>{formatBytes(hdBytes)}</small> : null}
              </button>
            ) : null}
            {canWeb ? (
              <button type="button" className={fs.secondary} onClick={() => downloadAll('web')} disabled={!!zip}>
                Version web (plus légère)
              </button>
            ) : null}
          </div>
        ) : null}
        {dl.length ? (
          <p className={fs.note}>Une seule archive ZIP, avec un dossier par galerie. Gardez la page ouverte pendant le téléchargement.</p>
        ) : null}
      </header>

      <main className={fs.grid}>
        {items.length ? (
          items.map((i) => (
            <a key={i.id} className={fs.card} href={`/client/${encodeURIComponent(i.slug)}`}>
              <div className={fs.thumb}>
                {i.cover ? (
                  <img
                    src={i.cover}
                    alt=""
                    loading="lazy"
                    style={i.focus ? { objectPosition: `${i.focus.x * 100}% ${i.focus.y * 100}%` } : undefined}
                  />
                ) : (
                  <Images size={28} />
                )}
              </div>
              <div className={fs.cardBody}>
                <b>{i.title}</b>
                <span>
                  {i.count} élément{i.count > 1 ? 's' : ''}
                  {i.bytes ? ` · ${formatBytes(i.bytes)}` : ''}
                </span>
              </div>
            </a>
          ))
        ) : (
          <p className={fs.empty}>Aucune galerie disponible dans ce dossier pour le moment.</p>
        )}
      </main>

      {zip ? (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <h2>{zip.total && zip.done >= zip.total ? 'Téléchargement terminé' : 'Téléchargement en cours'}</h2>
            <p className={styles.sub}>Gardez cette page ouverte jusqu’à la fin.</p>
            <div className={styles.progress}>
              <small>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{zip.label}</span>
                <span>{zip.total ? `${zip.done} / ${zip.total}` : ''}</span>
              </small>
              <div className={styles.progressBar}>
                <i style={{ width: `${Math.round((zip.done / Math.max(1, zip.total)) * 100)}%` }} />
              </div>
            </div>
            {!zip.total || zip.done < zip.total ? (
              <button type="button" className={styles.zipStop} onClick={() => zipAbort.current?.abort()}>
                Arrêter le téléchargement
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </ClientShell>
  );
}
