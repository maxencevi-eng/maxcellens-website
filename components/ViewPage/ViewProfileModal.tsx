"use client";
import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import type { ViewProfile, TitleStyleKey, Align } from './types';
import { compressImageClient } from '../../lib/compressImageClient';
import styles from './ViewProfileModal.module.css';

interface Props {
  profile: ViewProfile;
  onClose: () => void;
  onSave: (updated: ViewProfile) => void;
}

export default function ViewProfileModal({ profile, onClose, onSave }: Props) {
  const [tab, setTab] = useState<'identity' | 'background'>('identity');

  const [title, setTitle] = useState(profile.title || '');
  const [titleStyle, setTitleStyle] = useState<TitleStyleKey>(profile.titleStyle || 'h2');
  const [titleFontSizeStr, setTitleFontSizeStr] = useState(String(profile.titleFontSize || 24));
  const [titleColor, setTitleColor] = useState(profile.titleColor || '');
  const [titleAlign, setTitleAlign] = useState<Align>(profile.titleAlign || 'center');

  const [subtitle, setSubtitle] = useState(profile.subtitle || '');
  const [subtitleFontSizeStr, setSubtitleFontSizeStr] = useState(String(profile.subtitleFontSize || 14));
  const [subtitleColor, setSubtitleColor] = useState(profile.subtitleColor || '');
  const [subtitleAlign, setSubtitleAlign] = useState<Align>(profile.subtitleAlign || 'center');

  const [bgImageUrl, setBgImageUrl] = useState(profile.backgroundImageUrl || '');
  const [bgImagePath, setBgImagePath] = useState(profile.backgroundImagePath || '');
  const [uploadingBg, setUploadingBg] = useState(false);

  const [saving, setSaving] = useState(false);

  async function uploadBg(file: File) {
    setUploadingBg(true);
    try {
      const compressed = await compressImageClient(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('page', 'view');
      fd.append('kind', 'image');
      fd.append('folder', 'view/background');
      if (bgImagePath) fd.append('old_path', bgImagePath);
      const r = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      if (r.ok) {
        const d = await r.json();
        setBgImageUrl(d.url || '');
        setBgImagePath(d.path || '');
      }
    } finally {
      setUploadingBg(false);
    }
  }

  function handleSave() {
    setSaving(true);
    onSave({
      ...profile,
      title: title || undefined,
      titleStyle,
      titleFontSize: titleFontSizeStr ? Math.max(8, Math.min(80, parseInt(titleFontSizeStr, 10) || 24)) : undefined,
      titleColor: titleColor || undefined,
      titleAlign,
      subtitle: subtitle || undefined,
      subtitleFontSize: subtitleFontSizeStr ? Math.max(8, Math.min(60, parseInt(subtitleFontSizeStr, 10) || 14)) : undefined,
      subtitleColor: subtitleColor || undefined,
      subtitleAlign,
      backgroundImageUrl: bgImageUrl || undefined,
      backgroundImagePath: bgImagePath || undefined,
    });
    setSaving(false);
  }

  return (
    <Modal
      title="Modifier le profil"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className={styles.tabs}>
        {(['identity', 'background'] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'identity' ? 'Identité' : 'Arrière-plan'}
          </button>
        ))}
      </div>

      {tab === 'identity' && (
        <div className={styles.section}>
          <div className={styles.label}>Titre</div>
          <input type="text" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Votre nom…" />
          <div className={styles.row}>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Style</div>
              <select className={styles.select} value={titleStyle} onChange={(e) => setTitleStyle(e.target.value as TitleStyleKey)}>
                {(['h1','h2','h3','h4','h5','p'] as TitleStyleKey[]).map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Taille (px)</div>
              <input type="number" className={styles.input} value={titleFontSizeStr}
                onChange={(e) => setTitleFontSizeStr(e.target.value)} />
            </div>
          </div>
          <div className={styles.row}>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Couleur titre</div>
              <input type="color" className={styles.colorInput} value={titleColor || '#000000'} onChange={(e) => setTitleColor(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Alignement</div>
              <select className={styles.select} value={titleAlign} onChange={(e) => setTitleAlign(e.target.value as Align)}>
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div className={styles.label}>Sous-titre</div>
          <input type="text" className={styles.input} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Votre accroche…" />
          <div className={styles.row}>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Taille (px)</div>
              <input type="number" className={styles.input} value={subtitleFontSizeStr}
                onChange={(e) => setSubtitleFontSizeStr(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Couleur</div>
              <input type="color" className={styles.colorInput} value={subtitleColor || '#555555'} onChange={(e) => setSubtitleColor(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.label}>Alignement</div>
              <select className={styles.select} value={subtitleAlign} onChange={(e) => setSubtitleAlign(e.target.value as Align)}>
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === 'background' && (
        <div className={styles.section}>
          <div className={styles.label}>Image de fond de page</div>
          {bgImageUrl ? (
            <div className={styles.bgPreview}>
              <img src={bgImageUrl} alt="Fond" />
              <button type="button" onClick={() => { setBgImageUrl(''); setBgImagePath(''); }}>Supprimer</button>
            </div>
          ) : (
            <div className={styles.hint}>Aucune image — la couleur de fond du site est utilisée par défaut.</div>
          )}
          <label className={styles.uploadLabel}>
            {uploadingBg ? 'Import…' : 'Importer une image de fond'}
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingBg}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); }} />
          </label>
        </div>
      )}
    </Modal>
  );
}
