"use client";

import { mediaKindOf, MAX_FILE_BYTES, MAX_IMAGE_BYTES, type Watermark } from '../../../lib/clientGalleries/types';
import { adminApi } from './api';
import { renderImage, renderVideo, watermarkFromUrl, type Rendered } from './renditions';

/**
 * Envoi d'éléments dans une galerie :
 *   1. rendus générés localement (photos, image extraite des vidéos) ;
 *   2. le serveur crée les lignes et renvoie des URL d'envoi signées ;
 *   3. le navigateur envoie directement chez R2 (jamais via Vercel) ;
 *   4. le serveur marque les éléments comme prêts.
 *
 * Traitement par lots de 6, avec 3 éléments en parallèle.
 */

export type UploadProgress = {
  done: number;
  total: number;
  bytesDone: number;
  bytesTotal: number;
  current: string;
  errors: { name: string; error: string }[];
};

const BATCH = 6;
const PARALLEL = 3;

function putWithProgress(url: string, body: Blob, contentType: string, onBytes: (n: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    let last = 0;
    xhr.upload.onprogress = (e) => {
      onBytes(e.loaded - last);
      last = e.loaded;
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Réseau / CORS : vérifiez la règle CORS du bucket R2'));
    xhr.send(body);
  });
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let err: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw err;
}

export async function uploadFiles(
  galleryId: string,
  files: File[],
  opts: {
    setId?: string | null;
    watermark?: Watermark | null;
    wmKey?: string | null;
    onProgress?: (p: UploadProgress) => void;
    signal?: { cancelled: boolean };
  } = {}
): Promise<UploadProgress> {
  const prog: UploadProgress = {
    done: 0,
    total: files.length,
    bytesDone: 0,
    bytesTotal: files.reduce((a, f) => a + f.size, 0),
    current: '',
    errors: [],
  };
  const emit = () => opts.onProgress?.({ ...prog, errors: [...prog.errors] });
  emit();

  // Tri naturel par nom (IMG_2 avant IMG_10)
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));

  for (let i = 0; i < sorted.length; i += BATCH) {
    if (opts.signal?.cancelled) break;
    const batch = sorted.slice(i, i + BATCH);

    // 1. rendus
    const prepared: { file: File; kind: ReturnType<typeof mediaKindOf>; r: Rendered | null }[] = [];
    for (const file of batch) {
      const kind = mediaKindOf(file.type, file.name);
      const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
      if (file.size > max) {
        prog.errors.push({ name: file.name, error: `trop lourd (${kind === 'image' ? '40 Mo' : '2 Go'} max)` });
        prog.done++;
        prog.bytesDone += file.size;
        emit();
        continue;
      }
      prog.current = `Préparation · ${file.name}`;
      emit();
      let r: Rendered | null = null;
      try {
        if (kind === 'image') r = await renderImage(file, opts.watermark || null);
        else if (kind === 'video') r = await renderVideo(file);
      } catch (e: any) {
        // Image non décodable : livrée comme simple fichier
        prog.errors.push({ name: file.name, error: `aperçu impossible (${e?.message || 'format'}) — envoyé comme fichier` });
      }
      prepared.push({ file, kind: kind === 'image' && !r ? 'file' : kind, r });
    }
    if (!prepared.length) continue;

    // 2. lignes + URL signées
    let uploads: { id: string; put: Record<string, string> }[];
    try {
      const j = await adminApi<{ uploads: typeof uploads }>(`/${galleryId}/photos`, {
        method: 'POST',
        json: {
          action: 'prepare',
          wm: !!opts.watermark,
          files: prepared.map(({ file, kind, r }) => ({
            name: file.name,
            // Image non décodable : on force un type « fichier » côté serveur
            type: kind === 'file' && file.type.startsWith('image/') ? 'application/octet-stream' : file.type,
            size: file.size,
            storedBytes: file.size + Object.values(r?.blobs || {}).reduce((a, b) => a + (b?.size || 0), 0),
            width: r?.width,
            height: r?.height,
            duration: r?.duration,
            placeholder: r?.placeholder,
            hasWeb: !!r?.blobs.web,
            hasPreview: !!r,
            setId: opts.setId || null,
          })),
        },
      });
      uploads = j.uploads;
    } catch (e: any) {
      for (const p of prepared) prog.errors.push({ name: p.file.name, error: e.message });
      prog.done += prepared.length;
      emit();
      continue;
    }

    // 3. envois parallèles
    const ok: string[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < prepared.length) {
        const idx = cursor++;
        const { file, r } = prepared[idx];
        const up = uploads[idx];
        prog.current = file.name;
        emit();
        try {
          await withRetry(() =>
            putWithProgress(up.put.original, file, file.type, (n) => {
              prog.bytesDone += n;
              emit();
            })
          );
          for (const [kind, url] of Object.entries(up.put)) {
            if (kind === 'original') continue;
            const blob = (r?.blobs as any)?.[kind];
            if (blob) await withRetry(() => putWithProgress(url, blob, 'image/webp', () => {}));
          }
          ok.push(up.id);
        } catch (e: any) {
          prog.errors.push({ name: file.name, error: e?.message || 'envoi impossible' });
        }
        prog.done++;
        emit();
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, prepared.length) }, worker));

    // 4. validation
    if (ok.length) {
      await adminApi(`/${galleryId}/photos`, {
        method: 'POST',
        json: { action: 'complete', ids: ok, wm_key: opts.watermark ? opts.wmKey : null },
      }).catch((e) => prog.errors.push({ name: 'validation', error: e.message }));
    }
  }
  prog.current = '';
  emit();
  return prog;
}

/**
 * Régénère les rendus filigranés des photos dont la signature de filigrane
 * diffère de celle attendue (changement ou activation du filigrane).
 */
export async function regenerateWatermarks(
  galleryId: string,
  photos: { id: string; kind: string; wm_key: string | null; stored_bytes: number; has_preview: boolean }[],
  wm: Watermark,
  wmKey: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ done: number; errors: number }> {
  const todo = photos.filter((p) => p.kind === 'image' && p.has_preview && p.wm_key !== wmKey);
  let done = 0;
  let errors = 0;
  onProgress?.(0, todo.length);
  for (let i = 0; i < todo.length; i += 12) {
    const slice = todo.slice(i, i + 12);
    const ids = slice.map((p) => p.id);
    const [get, put] = await Promise.all([
      adminApi<{ urls: Record<string, Record<string, string>> }>(`/${galleryId}/photos`, {
        method: 'POST',
        json: { action: 'sign', ids, kinds: ['thumb', 'screen'], method: 'GET' },
      }),
      adminApi<{ urls: Record<string, Record<string, string>> }>(`/${galleryId}/photos`, {
        method: 'POST',
        json: { action: 'sign', ids, kinds: ['thumb-wm', 'screen-wm'], method: 'PUT' },
      }),
    ]);
    const ok: string[] = [];
    const stored: Record<string, number> = {};
    await Promise.all(
      slice.map(async (p) => {
        try {
          const [t, s] = await Promise.all([watermarkFromUrl(get.urls[p.id].thumb, wm), watermarkFromUrl(get.urls[p.id].screen, wm)]);
          await Promise.all([
            withRetry(() => putWithProgress(put.urls[p.id]['thumb-wm'], t, 'image/webp', () => {})),
            withRetry(() => putWithProgress(put.urls[p.id]['screen-wm'], s, 'image/webp', () => {})),
          ]);
          ok.push(p.id);
          // Poids approximatif : on remplace l'ancien rendu filigrané par le nouveau
          stored[p.id] = p.stored_bytes + (p.wm_key ? 0 : t.size + s.size);
        } catch {
          errors++;
        }
        done++;
        onProgress?.(done, todo.length);
      })
    );
    if (ok.length) {
      await adminApi(`/${galleryId}/photos`, { method: 'POST', json: { action: 'set_wm_key', ids: ok, wm_key: wmKey, stored } });
    }
  }
  return { done, errors };
}
