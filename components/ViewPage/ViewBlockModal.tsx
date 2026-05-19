"use client";
import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import type { ViewBlock, ViewBlockSize } from './types';
import { compressImageClient } from '../../lib/compressImageClient';
import SimpleRichEditor from './SimpleRichEditor';
import styles from './ViewBlockModal.module.css';

const PRESET_COLORS = ['#f0ece4', '#e8d5be', '#2e4a35', '#5c1a1a', '#111111', '#2a2a2a'];

const SIZE_OPTIONS: { value: ViewBlockSize; label: string; desc: string; preview: string }[] = [
  { value: 'square',  label: 'Carré',   desc: '1×1',  preview: '□' },
  { value: 'wide',    label: 'Large',   desc: '2×1',  preview: '▬' },
  { value: 'compact', label: 'Compact', desc: '2×½',  preview: '▭' },
  { value: 'tall',    label: 'Haut',    desc: '1×2',  preview: '▮' },
  { value: 'large',   label: 'Grand',   desc: '2×2',  preview: '■' },
];

interface Props {
  block: ViewBlock;
  onClose: () => void;
  onSave: (updated: ViewBlock) => void;
  onDelete: (id: string) => void;
}

export default function ViewBlockModal({ block, onClose, onSave, onDelete }: Props) {
  const [tab, setTab] = useState<'appearance' | 'size' | 'content'>('content');
  const [bgColor, setBgColor] = useState(block.backgroundColor || '');
  const [textColor, setTextColor] = useState(block.textColor || '');
  const [size, setSize] = useState<ViewBlockSize>(block.size || 'square');
  const [caption, setCaption] = useState(block.caption || '');
  const [noShadow, setNoShadow] = useState(block.noShadow || false);

  // TEXT — Fix 3: use rich text, no separate fontSize/align
  const [textHtml, setTextHtml] = useState(block.textHtml || '');

  // LINK
  const [url, setUrl] = useState(block.url || '');
  const [linkTitle, setLinkTitle] = useState(block.linkTitle || '');
  const [linkDescription, setLinkDescription] = useState(block.linkDescription || '');
  const [linkFaviconUrl, setLinkFaviconUrl] = useState(block.linkFaviconUrl || '');
  const [linkImageUrl, setLinkImageUrl] = useState(block.linkImageUrl || '');
  const [linkImagePath, setLinkImagePath] = useState(block.linkImagePath || '');
  const [fetchingPreview, setFetchingPreview] = useState(false);

  // VIDEO
  const [videoUrl, setVideoUrl] = useState(block.videoUrl || '');

  // PHOTO — Fix 6: string state for interval input
  const [photos, setPhotos] = useState<Array<{ url: string; path?: string; focus?: { x: number; y: number } }>>(block.photos || []);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [photoIntervalStr, setPhotoIntervalStr] = useState(String(block.photoInterval ?? 0));
  const [hideCounter, setHideCounter] = useState(block.hideCounter || false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // MAP
  const [mapQuery, setMapQuery] = useState(block.mapQuery || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchLinkPreview() {
    if (!url.trim() || !/^https?:\/\//i.test(url)) return;
    setFetchingPreview(true);
    try {
      const r = await fetch(`/api/view-link-preview?url=${encodeURIComponent(url)}`);
      if (r.ok) {
        const data = await r.json();
        if (data.title && !linkTitle) setLinkTitle(data.title);
        if (data.faviconUrl && !linkFaviconUrl) setLinkFaviconUrl(data.faviconUrl);
        if (data.imageUrl && !linkImageUrl) setLinkImageUrl(data.imageUrl);
      }
    } catch (_) {}
    finally { setFetchingPreview(false); }
  }

  async function uploadLinkImage(file: File) {
    const compressed = await compressImageClient(file);
    const fd = new FormData();
    fd.append('file', compressed);
    fd.append('page', 'view');
    fd.append('kind', 'image');
    fd.append('folder', `view/links/${block.id}`);
    if (linkImagePath) fd.append('old_path', linkImagePath);
    const r = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
    if (r.ok) {
      const d = await r.json();
      setLinkImageUrl(d.url || '');
      setLinkImagePath(d.path || '');
    }
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    try {
      const compressed = await compressImageClient(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('page', 'view');
      fd.append('kind', 'image');
      fd.append('folder', `view/photos/${block.id}`);
      const r = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      if (r.ok) {
        const d = await r.json();
        setPhotos((prev) => [...prev, { url: d.url, path: d.path }]);
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    setSaving(true);
    const updated: ViewBlock = {
      ...block,
      size,
      backgroundColor: bgColor || undefined,
      textColor: textColor || undefined,
      caption: caption || undefined,
      noShadow: noShadow || undefined,
    };
    if (block.type === 'text') {
      updated.textHtml = textHtml;
      // fontSize/align removed — handled by rich text inline
      updated.fontSize = undefined;
    }
    if (block.type === 'link') {
      updated.url = url;
      updated.linkTitle = linkTitle;
      updated.linkDescription = linkDescription;
      updated.linkFaviconUrl = linkFaviconUrl || undefined;
      updated.linkImageUrl = linkImageUrl || undefined;
      updated.linkImagePath = linkImagePath || undefined;
    }
    if (block.type === 'video') {
      updated.videoUrl = videoUrl;
    }
    if (block.type === 'photo') {
      updated.photos = photos;
      const parsed = parseInt(photoIntervalStr, 10);
      updated.photoInterval = isNaN(parsed) ? 0 : Math.max(0, Math.min(60, parsed));
      updated.hideCounter = hideCounter || undefined;
    }
    if (block.type === 'map') {
      updated.mapQuery = mapQuery;
    }
    onSave(updated);
    setSaving(false);
  }

  const typeLabel: Record<string, string> = {
    text: 'Texte', link: 'Lien', video: 'Vidéo', photo: 'Photo', map: 'Carte',
  };

  return (
    <Modal
      title={`Modifier — ${typeLabel[block.type] || block.type}`}
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => { setDeleting(true); onDelete(block.id); }}
            disabled={deleting}
          >
            Supprimer
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Annuler</button>
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.tabs}>
        {(['content', 'appearance', 'size'] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'content' ? 'Contenu' : t === 'appearance' ? 'Apparence' : 'Taille'}
          </button>
        ))}
      </div>

      {tab === 'appearance' && (
        <div className={styles.section}>
          <div className={styles.label}>Couleur de fond</div>
          <div className={styles.colorRow}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`${styles.colorChip} ${bgColor === c ? styles.colorChipActive : ''}`}
                style={{ background: c }}
                onClick={() => setBgColor(bgColor === c ? '' : c)}
                aria-label={c}
              />
            ))}
            <label className={styles.colorPickerLabel} title="Couleur personnalisée">
              <span className={styles.colorPickerIcon}>🎨</span>
              <input type="color" value={bgColor || '#ffffff'} onChange={(e) => setBgColor(e.target.value)} className={styles.colorPickerInput} />
            </label>
            {bgColor && (
              <button className={styles.colorReset} onClick={() => setBgColor('')} title="Réinitialiser">✕</button>
            )}
          </div>

          <div className={styles.label} style={{ marginTop: 16 }}>Couleur du texte</div>
          <div className={styles.colorRow}>
            {['#ffffff', '#f5f0e8', '#111111', '#444444', '#888888', '#e8d5be'].map((c) => (
              <button
                key={c}
                className={`${styles.colorChip} ${textColor === c ? styles.colorChipActive : ''}`}
                style={{ background: c, border: c === '#ffffff' ? '1px solid #ddd' : undefined }}
                onClick={() => setTextColor(textColor === c ? '' : c)}
                aria-label={c}
              />
            ))}
            <label className={styles.colorPickerLabel} title="Couleur personnalisée">
              <span className={styles.colorPickerIcon}>🎨</span>
              <input type="color" value={textColor || '#000000'} onChange={(e) => setTextColor(e.target.value)} className={styles.colorPickerInput} />
            </label>
            {textColor && (
              <button className={styles.colorReset} onClick={() => setTextColor('')} title="Réinitialiser">✕</button>
            )}
          </div>

          <div className={styles.label} style={{ marginTop: 16 }}>Légende (optionnel)</div>
          <input
            type="text"
            className={styles.input}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Légende sous le bloc…"
          />

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={noShadow}
                onChange={(e) => setNoShadow(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Désactiver l'ombrage
            </label>
          </div>
        </div>
      )}

      {tab === 'size' && (
        <div className={styles.sizeGrid}>
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.sizeOption} ${size === opt.value ? styles.sizeOptionActive : ''}`}
              onClick={() => setSize(opt.value)}
            >
              <span className={styles.sizePreview}>{opt.preview}</span>
              <span className={styles.sizeLabel}>{opt.label}</span>
              <span className={styles.sizeDesc}>{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Fix 3: rich text editor for text blocks */}
      {tab === 'content' && block.type === 'text' && (
        <div className={styles.section}>
          <div className={styles.label}>Texte</div>
          <SimpleRichEditor
            value={textHtml}
            onChange={setTextHtml}
            placeholder="Votre texte ici…"
          />
        </div>
      )}

      {tab === 'content' && block.type === 'link' && (
        <div className={styles.section}>
          <div className={styles.label}>URL</div>
          <div className={styles.row}>
            <input
              type="url"
              className={styles.input}
              style={{ flex: 1 }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
            <button
              type="button"
              className={styles.previewBtn}
              onClick={fetchLinkPreview}
              disabled={fetchingPreview || !url}
            >
              {fetchingPreview ? '…' : 'Aperçu'}
            </button>
          </div>

          <div className={styles.label} style={{ marginTop: 12 }}>Titre</div>
          <input type="text" className={styles.input} value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Titre du lien" />

          <div className={styles.label} style={{ marginTop: 12 }}>Description</div>
          <input type="text" className={styles.input} value={linkDescription} onChange={(e) => setLinkDescription(e.target.value)} placeholder="Description courte" />

          <div className={styles.label} style={{ marginTop: 12 }}>Image de prévisualisation</div>
          {linkImageUrl && (
            <div className={styles.imgPreview}>
              <img src={linkImageUrl} alt="" />
              <button onClick={() => { setLinkImageUrl(''); setLinkImagePath(''); }}>✕</button>
            </div>
          )}
          <label className={styles.uploadLabel}>
            Importer une image
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLinkImage(f); }} />
          </label>

          <div className={styles.label} style={{ marginTop: 12 }}>URL icône (favicon)</div>
          <input type="url" className={styles.input} value={linkFaviconUrl} onChange={(e) => setLinkFaviconUrl(e.target.value)} placeholder="https://... (auto-détecté)" />
        </div>
      )}

      {tab === 'content' && block.type === 'video' && (
        <div className={styles.section}>
          <div className={styles.label}>URL de la vidéo</div>
          <input
            type="url"
            className={styles.input}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube, Vimeo…"
          />
          <div className={styles.hint}>Supporte YouTube, YouTube Shorts, Vimeo</div>
        </div>
      )}

      {tab === 'content' && block.type === 'photo' && (
        <div className={styles.section}>
          <div className={styles.label}>Photos</div>
          <div className={styles.photoGrid}>
            {photos.map((p, i) => (
              <div key={i} className={styles.photoItem}>
                <img src={p.url} alt="" />
                <div className={styles.photoItemActions}>
                  <button
                    title="Point focal"
                    onClick={() => setFocusIndex(focusIndex === i ? null : i)}
                    className={focusIndex === i ? styles.photoFocusActive : ''}
                    aria-label="Point focal"
                  >⊕</button>
                  <button onClick={() => removePhoto(i)} aria-label="Supprimer">✕</button>
                </div>
              </div>
            ))}
          </div>

          {focusIndex !== null && photos[focusIndex] && (() => {
            const p = photos[focusIndex];
            return (
              <div className={styles.focusPicker}>
                <div className={styles.focusPickerLabel}>
                  Photo {focusIndex + 1} — cliquez pour définir le point focal
                  {p.focus && <span style={{ marginLeft: 6, color: 'var(--color-primary,#c89a5a)' }}>({p.focus.x}%, {p.focus.y}%)</span>}
                </div>
                <div
                  className={styles.focusPickerArea}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                    setPhotos((prev) => prev.map((ph, idx) => idx === focusIndex ? { ...ph, focus: { x, y } } : ph));
                  }}
                  style={{ backgroundImage: `url(${p.url})`, backgroundPosition: p.focus ? `${p.focus.x}% ${p.focus.y}%` : 'center' }}
                >
                  {p.focus && (
                    <div
                      className={styles.focusDot}
                      style={{ left: `${p.focus.x}%`, top: `${p.focus.y}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })()}

          <label className={styles.uploadLabel}>
            {uploadingPhoto ? 'Import…' : 'Ajouter une photo'}
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingPhoto}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
          </label>

          {/* Fix 6: interval input with free typing */}
          <div style={{ marginTop: 16 }}>
            <div className={styles.label}>Défilement automatique</div>
            <div className={styles.row} style={{ alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                className={styles.input}
                style={{ width: 80 }}
                value={photoIntervalStr}
                onChange={(e) => setPhotoIntervalStr(e.target.value)}
                placeholder="0"
              />
              <span style={{ fontSize: 13, color: 'var(--muted,#888)' }}>secondes entre chaque photo (0 = manuel)</span>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={hideCounter}
                onChange={(e) => setHideCounter(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Masquer la numérotation (x / x)
            </label>
          </div>
        </div>
      )}

      {tab === 'content' && block.type === 'map' && (
        <div className={styles.section}>
          <div className={styles.label}>Adresse ou lieu</div>
          <input
            type="text"
            className={styles.input}
            value={mapQuery}
            onChange={(e) => setMapQuery(e.target.value)}
            placeholder="Ex: 75001 Paris, France"
          />
          <div className={styles.hint}>Entrez une adresse complète pour afficher un point précis sur la carte.</div>
        </div>
      )}
    </Modal>
  );
}
