"use client";

import React, { useRef, useState } from 'react';
import { Replace, Upload } from 'lucide-react';
import { AdminButton, AdminModal } from '..';
import { sameName, watermarkKey, type AdminGallery, type Watermark } from '../../../lib/clientGalleries/types';
import { adminApi } from './api';
import { uploadFiles } from './uploader';
import s from './cg.module.css';

type Match = { galleryId: string; photoId: string; filename: string; key: string };
type Plan = { gallery: AdminGallery; files: File[] }[];

/**
 * Remplacement groupé : on dépose de nouvelles versions, chaque fichier
 * remplace l'élément du même nom (extension et casse ignorées) dans les
 * galeries visées. Position, section, couverture et favoris sont conservés.
 */
export default function ReplaceFiles({
  galleries,
  watermarks,
  scopeLabel,
  onClose,
  onDone,
}: {
  galleries: AdminGallery[];
  watermarks: Watermark[];
  scopeLabel: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [run, setRun] = useState<{ gallery: number; galleries: number; done: number; total: number; current: string } | null>(null);
  const [result, setResult] = useState<{ replaced: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancel = useRef({ cancelled: false });

  const analyze = async (list: File[]) => {
    const picked = list.filter((f) => f.size > 0);
    setFiles(picked);
    setPlan(null);
    setResult(null);
    setError(null);
    if (!picked.length) return;
    setAnalyzing(true);
    try {
      const j = await adminApi<{ matches: Match[] }>('/bulk', {
        method: 'POST',
        json: { ids: galleries.map((g) => g.id), action: 'find_by_names', names: picked.map((f) => f.name) },
      });
      const byKey = new Map<string, File>();
      for (const f of picked) byKey.set(sameName(f.name), f);
      const perGallery = new Map<string, Set<File>>();
      const used = new Set<string>();
      for (const m of j.matches) {
        const f = byKey.get(m.key);
        if (!f) continue;
        used.add(m.key);
        if (!perGallery.has(m.galleryId)) perGallery.set(m.galleryId, new Set());
        perGallery.get(m.galleryId)!.add(f);
      }
      setPlan(
        galleries
          .filter((g) => perGallery.has(g.id))
          .map((g) => ({ gallery: g, files: Array.from(perGallery.get(g.id)!) }))
      );
      setUnmatched(picked.filter((f) => !used.has(sameName(f.name))).map((f) => f.name));
    } catch (e: any) {
      setError(e.message);
    }
    setAnalyzing(false);
  };

  const start = async () => {
    if (!plan?.length) return;
    cancel.current = { cancelled: false };
    const total = plan.reduce((a, p) => a + p.files.length, 0);
    let done = 0;
    let replaced = 0;
    const errors: string[] = [];
    for (let i = 0; i < plan.length; i++) {
      if (cancel.current.cancelled) break;
      const { gallery: g, files: list } = plan[i];
      const wm = g.watermark_id ? watermarks.find((w) => w.id === g.watermark_id) || null : null;
      const base = done;
      setRun({ gallery: i + 1, galleries: plan.length, done, total, current: g.title });
      const res = await uploadFiles(g.id, list, {
        watermark: wm,
        wmKey: watermarkKey(wm),
        // Pas d'arrêt en pleine galerie : elle est traitée en entier, puis on s'arrête
        onProgress: (p) => setRun({ gallery: i + 1, galleries: plan.length, done: base + p.done, total, current: `${g.title} · ${p.current || ''}` }),
      });
      done = base + list.length;
      errors.push(...res.errors.map((e) => `${g.title} — ${e.name} : ${e.error}`));
      if (res.uploadedIds.length) {
        try {
          const j = await adminApi<{ replaced: number }>(`/${g.id}/photos`, { method: 'POST', json: { action: 'replace', newIds: res.uploadedIds } });
          replaced += j.replaced;
        } catch (e: any) {
          errors.push(`${g.title} : ${e.message}`);
        }
      }
    }
    setRun(null);
    setResult({ replaced, errors });
    onDone();
  };

  const busy = !!run;
  const matchedFiles = plan ? new Set(plan.flatMap((p) => p.files)).size : 0;
  const photos = plan ? plan.reduce((a, p) => a + p.files.length, 0) : 0;

  return (
    <AdminModal
      title="Remplacer des photos"
      subtitle={scopeLabel}
      size="lg"
      onClose={() => (busy ? (cancel.current.cancelled = true) : onClose())}
      disableOverlayClose={busy}
      footer={
        result ? (
          <AdminButton variant="primary" onClick={onClose}>
            Fermer
          </AdminButton>
        ) : busy ? (
          <AdminButton variant="secondary" onClick={() => (cancel.current.cancelled = true)}>
            Arrêter après la galerie en cours
          </AdminButton>
        ) : (
          <>
            <AdminButton variant="ghost" onClick={onClose}>
              Annuler
            </AdminButton>
            <AdminButton variant="primary" leadingIcon={<Replace size={15} />} disabled={!photos || analyzing} onClick={start}>
              Remplacer {photos ? `${photos} photo${photos > 1 ? 's' : ''}` : ''}
            </AdminButton>
          </>
        )
      }
    >
      <p className={s.muted} style={{ marginTop: 0 }}>
        Chaque fichier remplace l’élément <b>du même nom</b> (extension et majuscules ignorées) dans les galeries de « {scopeLabel} ». Il garde sa
        place, sa section, son rôle de couverture et ses favoris. Les fichiers sans correspondance sont ignorés.
      </p>

      {!busy && !result ? (
        <div
          className={s.drop}
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            analyze(Array.from(e.dataTransfer.files));
          }}
        >
          <div className={s.dropIcon}>
            <Upload size={22} />
          </div>
          <div className={s.dropText}>
            <b>{files.length ? `${files.length} fichier(s) choisi(s)` : 'Déposez les nouvelles versions ici'}</b>
            <small>Toutes les galeries d’un coup : peu importe dans quelle galerie se trouve chaque photo.</small>
          </div>
          <AdminButton size="sm" variant="secondary" onClick={() => input.current?.click()} loading={analyzing}>
            Choisir…
          </AdminButton>
          <input
            ref={input}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              e.target.value = '';
              analyze(list);
            }}
          />
        </div>
      ) : null}

      {error ? <div className={s.notice}>{error}</div> : null}

      {plan && !busy && !result ? (
        <div>
          <p style={{ margin: '0 0 8px' }}>
            <b>{matchedFiles}</b> fichier{matchedFiles > 1 ? 's' : ''} sur {files.length} trouvé{matchedFiles > 1 ? 's' : ''} →{' '}
            <b>{photos}</b> photo{photos > 1 ? 's' : ''} à remplacer dans <b>{plan.length}</b> galerie{plan.length > 1 ? 's' : ''}.
          </p>
          {photos > matchedFiles ? (
            <div className={s.notice}>Certains noms existent dans plusieurs galeries : la photo sera remplacée dans chacune.</div>
          ) : null}
          {unmatched.length ? (
            <details style={{ marginTop: 8 }}>
              <summary className={s.muted}>
                {unmatched.length} fichier{unmatched.length > 1 ? 's' : ''} sans correspondance (ignoré{unmatched.length > 1 ? 's' : ''})
              </summary>
              <div className={s.errors} style={{ color: 'var(--adm-ink-muted)' }}>
                {unmatched.join(', ')}
              </div>
            </details>
          ) : null}
          <div className={s.errors} style={{ color: 'var(--adm-ink-muted)', maxHeight: 160 }}>
            {plan.map((p) => (
              <div key={p.gallery.id}>
                {p.gallery.title} : {p.files.map((f) => f.name).join(', ')}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {run ? (
        <div>
          <p style={{ margin: 0 }}>
            Galerie {run.gallery} / {run.galleries} — {run.done} / {run.total} photo(s)
          </p>
          <div className={s.progressBar}>
            <i style={{ width: `${Math.round((run.done / Math.max(1, run.total)) * 100)}%` }} />
          </div>
          <p className={s.muted} style={{ fontSize: 12.5, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {run.current}
          </p>
          <p className={s.muted} style={{ fontSize: 12.5 }}>Gardez cette fenêtre ouverte pendant l’envoi.</p>
        </div>
      ) : null}

      {result ? (
        <div>
          <p style={{ margin: 0 }}>
            <b>{result.replaced}</b> photo{result.replaced > 1 ? 's' : ''} remplacée{result.replaced > 1 ? 's' : ''}.
            {cancel.current.cancelled ? ' Arrêt demandé : les galeries restantes n’ont pas été traitées.' : ''}
          </p>
          {result.errors.length ? (
            <div className={s.errors}>
              {result.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminModal>
  );
}
