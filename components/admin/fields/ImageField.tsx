"use client";

import React, { useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import Field from './Field';
import AdminButton from '../AdminButton';
import styles from './fields.module.css';

export type AdminImageValue = { url: string; path?: string } | null;

export type ImageFieldProps = {
  label?: string;
  value: AdminImageValue;
  onChange: (value: AdminImageValue) => void;
  hint?: string;
  disabled?: boolean;
  /** Dossier de destination dans le bucket `medias`. */
  folder?: string;
  /** Étiquette de provenance, reprise dans le nom de fichier généré. */
  page?: string;
  /** Supprime aussi le fichier du stockage quand on retire l'image. */
  deleteFromStorage?: boolean;
  accept?: string;
};

/**
 * Import d'image : aperçu, upload, suppression.
 *
 * Mutualise la logique dupliquée dans AdminSidebar (logo, favicon, logo footer),
 * ClientsEditModal, HeroEditor, SiteStyleEditor et les éditeurs de blocs.
 * L'upload passe par `/api/admin/upload-hero-media`, qui compresse en WebP.
 */
export default function ImageField({
  label,
  value,
  onChange,
  hint,
  disabled,
  folder,
  page = 'site',
  deleteFromStorage = true,
  accept = 'image/*',
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('page', page);
      fd.append('kind', 'image');
      if (folder) fd.append('folder', folder);
      // Le serveur supprime l'ancien fichier si on lui donne son chemin
      if (value?.path) fd.append('old_path', value.path);

      const resp = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Échec de l’import');
      if (!json?.url) throw new Error('Réponse sans URL');
      onChange({ url: json.url, path: json.path });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    const path = value?.path;
    onChange(null);
    if (deleteFromStorage && path) {
      try {
        await fetch('/api/admin/delete-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
      } catch (_) {
        // L'image est déjà retirée du contenu ; un orphelin de stockage
        // n'est pas bloquant pour l'utilisateur.
      }
    }
  }

  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <div className={styles.imageBox}>
          <div className={styles.imagePreview}>
            {value?.url ? (
              <img src={value.url} alt="" onError={() => setError('Image introuvable')} />
            ) : (
              <span className={styles.imageEmpty}>Aucune image</span>
            )}
          </div>

          <div className={styles.imageActions}>
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={accept}
              className={styles.hiddenInput}
              disabled={disabled || busy}
              aria-describedby={describedBy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            <AdminButton
              size="sm"
              variant="secondary"
              loading={busy}
              disabled={disabled}
              leadingIcon={<Upload size={14} aria-hidden="true" />}
              onClick={() => inputRef.current?.click()}
            >
              {value?.url ? 'Remplacer' : 'Importer une image'}
            </AdminButton>

            {value?.url ? (
              <AdminButton
                size="sm"
                variant="dangerGhost"
                disabled={disabled || busy}
                leadingIcon={<Trash2 size={14} aria-hidden="true" />}
                onClick={remove}
              >
                Retirer
              </AdminButton>
            ) : null}

            {value?.url ? <span className={styles.imageMeta}>{value.url.split('/').pop()}</span> : null}
          </div>
        </div>
      )}
    </Field>
  );
}
