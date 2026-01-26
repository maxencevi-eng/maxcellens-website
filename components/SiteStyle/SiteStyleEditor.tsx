"use client";
import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import styles from './SiteStyle.module.css';
import { useSiteStyle } from './SiteStyleProvider';
import type { SiteStyle } from './SiteStyleProvider';

export default function SiteStyleEditor({ onClose }: { onClose: () => void }) {
  const { style, setStyle, saveStyle } = useSiteStyle();
  const [tab, setTab] = useState<'colors'|'typography'>('colors');
  const [local, setLocal] = useState<SiteStyle>(style || {});
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setLocal(style || {}), [style]);

  // Apply live preview while editing (don't persist until Save)
  useEffect(() => {
    try { setStyle(local); } catch (e) {}
  }, [local]);

  function updateColors(next: Partial<any>) {
    setLocal((s) => ({ ...s, colors: { ...(s.colors || {}), ...next } }));
  }

  function updateTypography(key: string, next: Partial<any>) {
    setLocal((s) => ({ ...s, typography: { ...(s.typography || {}), [key]: { ...(s.typography?.[key] || {}), ...next } } }));
  }

  async function handleFontUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const resp = await fetch('/api/admin/upload-font', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Upload failed');
      const url = json?.publicUrl || json?.url;
      if (!url) throw new Error('No url returned');
      const name = f.name.replace(/\.[^.]+$/, '') || `font-${Date.now()}`;
      const fonts = [...(local.fonts || []), { name, url }];
      setLocal((s) => ({ ...s, fonts }));
      setMessage('Police importée');
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  function onSave() {
    setStyle(local);
    saveStyle(local);
    onClose();
  }

  const fontOptions = (local.fonts || []).map((f: any) => ({ label: f.name, value: f.name }));

  return (
    <Modal title="Modifier le style" onClose={onClose} footer={(
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="menu-item" onClick={onClose}>Annuler</button>
        <button className="menu-item" onClick={onSave}>Enregistrer</button>
      </div>
    )}>
      <div className={styles.tabs} role="tablist">
        <button className={tab === 'colors' ? styles.active : ''} onClick={() => setTab('colors')} role="tab">Couleurs</button>
        <button className={tab === 'typography' ? styles.active : ''} onClick={() => setTab('typography')} role="tab">Typographie</button>
      </div>

      {tab === 'colors' ? (
        <div className={styles.panel}>
          <label>Couleur de fond</label>
          <input type="color" value={local.colors?.bgColor || '#ffffff'} onChange={(e) => updateColors({ bgColor: e.target.value })} />

          <label>Couleur primaire</label>
          <input type="color" value={local.colors?.primary || '#0070f3'} onChange={(e) => updateColors({ primary: e.target.value })} />

          <label>Couleur secondaire</label>
          <input type="color" value={local.colors?.secondary || '#111111'} onChange={(e) => updateColors({ secondary: e.target.value })} />

          <label>Couleur du texte</label>
          <input type="color" value={local.colors?.text || '#111111'} onChange={(e) => updateColors({ text: e.target.value })} />
        </div>
      ) : (
        <div className={styles.panel}>
          <div style={{ marginBottom: 8 }}>
            <label>Importer une police (.woff/.ttf)</label>
            <input type="file" accept=".woff,.woff2,.ttf,.otf" onChange={handleFontUpload} />
            {uploading ? <div>Import...</div> : null}
            {message ? <div style={{ fontSize: 13, marginTop: 6 }}>{message}</div> : null}


          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
            <h4>Titre 1</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={local.typography?.h1?.family || ''} onChange={(e) => updateTypography('h1', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={local.typography?.h1?.size || ''} placeholder="32px" onChange={(e) => updateTypography('h1', { size: e.target.value })} />
              <input type="number" value={Number(local.typography?.h1?.weight || 800)} onChange={(e) => updateTypography('h1', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 2</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={local.typography?.h2?.family || ''} onChange={(e) => updateTypography('h2', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={local.typography?.h2?.size || ''} placeholder="28px" onChange={(e) => updateTypography('h2', { size: e.target.value })} />
              <input type="number" value={Number(local.typography?.h2?.weight || 600)} onChange={(e) => updateTypography('h2', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 3</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={local.typography?.h3?.family || ''} onChange={(e) => updateTypography('h3', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={local.typography?.h3?.size || ''} placeholder="22px" onChange={(e) => updateTypography('h3', { size: e.target.value })} />
              <input type="number" value={Number(local.typography?.h3?.weight || 600)} onChange={(e) => updateTypography('h3', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 4</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={local.typography?.h4?.family || ''} onChange={(e) => updateTypography('h4', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={local.typography?.h4?.size || ''} placeholder="18px" onChange={(e) => updateTypography('h4', { size: e.target.value })} />
              <input type="number" value={Number(local.typography?.h4?.weight || 600)} onChange={(e) => updateTypography('h4', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 5</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={local.typography?.h5?.family || ''} onChange={(e) => updateTypography('h5', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={local.typography?.h5?.size || ''} placeholder="16px" onChange={(e) => updateTypography('h5', { size: e.target.value })} />
              <input type="number" value={Number(local.typography?.h5?.weight || 600)} onChange={(e) => updateTypography('h5', { weight: String(e.target.value) })} />
            </div>

            <h4>Paragraphe</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={local.typography?.p?.family || ''} onChange={(e) => updateTypography('p', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={local.typography?.p?.size || ''} placeholder="16px" onChange={(e) => updateTypography('p', { size: e.target.value })} />
              <input type="number" value={Number(local.typography?.p?.weight || 400)} onChange={(e) => updateTypography('p', { weight: String(e.target.value) })} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
