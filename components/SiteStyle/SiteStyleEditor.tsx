"use client";
import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import styles from './SiteStyle.module.css';
import { useSiteStyle } from './SiteStyleProvider';
import type { SiteStyle } from './SiteStyleProvider';

export default function SiteStyleEditor({ onClose }: { onClose: () => void }) {
  const { style, setStyle, saveStyle } = useSiteStyle();
  const [tab, setTab] = useState<'colors'|'typography'>('colors');
  const [local, setLocal] = useState<SiteStyle>(() => style || {});
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setLocal(style || {}), [style]);

  // Garantir des valeurs string pour les inputs contrôlés (éviter controlled/uncontrolled)
  const colorKeys = ['bgColor', 'blockBgColor', 'primary', 'secondary', 'text', 'link', 'linkHover', 'linkActive'] as const;
  const safeColor = (key: typeof colorKeys[number]) => {
    const v = local?.colors?.[key];
    return typeof v === 'string' ? v : undefined;
  };
  const safeButtonColor = (styleKey: 'button1' | 'button2', prop: 'bg' | 'color') => {
    const v = local?.colors?.[styleKey]?.[prop];
    return typeof v === 'string' ? v : undefined;
  };
  const fallback = (v: string | undefined, d: string) => (v !== undefined && v !== null && v !== '') ? v : d;

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

  // Extracted constants to avoid complex inline expressions in JSX
  const colorBg = fallback(safeColor('bgColor'), '#ffffff');
  const colorBlockBg = fallback(safeColor('blockBgColor'), '#fafaf9');
  const colorPrimary = fallback(safeColor('primary'), '#0070f3');
  const colorSecondary = fallback(safeColor('secondary'), '#111111');
  const colorText = fallback(safeColor('text'), '#111111');
  const colorLink = fallback(safeColor('link'), '#0070f3');
  const colorLinkHover = fallback(safeColor('linkHover'), '#005bb5');
  const colorLinkActive = fallback(safeColor('linkActive'), '#004080');

  const btn1Bg = fallback(safeButtonColor('button1', 'bg'), '#213431');
  const btn1Color = fallback(safeButtonColor('button1', 'color'), '#ffffff');
  const btn2Bg = fallback(safeButtonColor('button2', 'bg'), '#ffffff');
  const btn2Color = fallback(safeButtonColor('button2', 'color'), '#213431');

  const h1Family = local.typography?.h1?.family || '';
  const h1Size = local.typography?.h1?.size || '';
  const h1Weight = String(local.typography?.h1?.weight || 800);

  const h2Family = local.typography?.h2?.family || '';
  const h2Size = local.typography?.h2?.size || '';
  const h2Weight = String(local.typography?.h2?.weight || 600);

  const h3Family = local.typography?.h3?.family || '';
  const h3Size = local.typography?.h3?.size || '';
  const h3Weight = String(local.typography?.h3?.weight || 600);

  const h4Family = local.typography?.h4?.family || '';
  const h4Size = local.typography?.h4?.size || '';
  const h4Weight = String(local.typography?.h4?.weight || 600);

  const h5Family = local.typography?.h5?.family || '';
  const h5Size = local.typography?.h5?.size || '';
  const h5Weight = String(local.typography?.h5?.weight || 600);

  const pFamily = local.typography?.p?.family || '';
  const pSize = local.typography?.p?.size || '';
  const pWeight = String(local.typography?.p?.weight || 400);

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
        <div className={`${styles.panel} ${styles.colorsGrid}`}>
          <div>
            <div className={styles.colorRow}>
              <label>Couleur de fond (page)</label>
              <input type="color" value={colorBg} onChange={(e) => updateColors({ bgColor: e.target.value })} />
            </div>
            <div className={styles.colorRow}>
              <label>Couleur de fond des blocs</label>
              <input type="color" value={colorBlockBg} onChange={(e) => updateColors({ blockBgColor: e.target.value })} />
            </div>
            <div className={styles.colorRow}>
              <label>Couleur primaire</label>
              <input type="color" value={colorPrimary} onChange={(e) => updateColors({ primary: e.target.value })} />
            </div>
            <div className={styles.colorRow}>
              <label>Couleur secondaire</label>
              <input type="color" value={colorSecondary} onChange={(e) => updateColors({ secondary: e.target.value })} />
            </div>
            <div className={styles.colorRow}>
              <label>Couleur du texte</label>
              <input type="color" value={colorText} onChange={(e) => updateColors({ text: e.target.value })} />
            </div>
            <h4 style={{ margin: '16px 0 8px' }}>Liens hypertextes</h4>
            <div className={styles.colorRow}>
              <label>Liens (couleur par défaut)</label>
              <input type="color" value={colorLink} onChange={(e) => updateColors({ link: e.target.value })} />
            </div>
            <div className={styles.colorRow}>
              <label>Liens au survol</label>
              <input type="color" value={colorLinkHover} onChange={(e) => updateColors({ linkHover: e.target.value })} />
            </div>
            <div className={styles.colorRow}>
              <label>Liens au clic</label>
              <input type="color" value={colorLinkActive} onChange={(e) => updateColors({ linkActive: e.target.value })} />
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 12px' }}>Boutons</h4>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Deux styles de boutons utilisables dans les modaux (CTA, liens principaux).</p>
            <div style={{ marginBottom: 12 }}>
              <div className={styles.colorRow}>
                <label>Style 1 — Fond</label>
                <input type="color" value={btn1Bg} onChange={(e) => updateColors({ button1: { ...(local.colors?.button1 || {}), bg: e.target.value } })} />
              </div>
              <div className={styles.colorRow}>
                <label>Style 1 — Texte</label>
                <input type="color" value={btn1Color} onChange={(e) => updateColors({ button1: { ...(local.colors?.button1 || {}), color: e.target.value } })} />
              </div>
            </div>
            <div>
              <div className={styles.colorRow}>
                <label>Style 2 — Fond</label>
                <input type="color" value={btn2Bg} onChange={(e) => updateColors({ button2: { ...(local.colors?.button2 || {}), bg: e.target.value } })} />
              </div>
              <div className={styles.colorRow}>
                <label>Style 2 — Texte</label>
                <input type="color" value={btn2Color} onChange={(e) => updateColors({ button2: { ...(local.colors?.button2 || {}), color: e.target.value } })} />
              </div>
            </div>
          </div>
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
            <div className={styles.typographyRow}>
              <select value={h1Family} onChange={(e) => updateTypography('h1', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={h1Size} placeholder="32px" onChange={(e) => updateTypography('h1', { size: e.target.value })} />
              <input type="number" value={h1Weight} onChange={(e) => updateTypography('h1', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 2</h4>
            <div className={styles.typographyRow}>
              <select value={h2Family} onChange={(e) => updateTypography('h2', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={h2Size} placeholder="28px" onChange={(e) => updateTypography('h2', { size: e.target.value })} />
              <input type="number" value={h2Weight} onChange={(e) => updateTypography('h2', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 3</h4>
            <div className={styles.typographyRow}>
              <select value={h3Family} onChange={(e) => updateTypography('h3', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={h3Size} placeholder="22px" onChange={(e) => updateTypography('h3', { size: e.target.value })} />
              <input type="number" value={h3Weight} onChange={(e) => updateTypography('h3', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 4</h4>
            <div className={styles.typographyRow}>
              <select value={h4Family} onChange={(e) => updateTypography('h4', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={h4Size} placeholder="18px" onChange={(e) => updateTypography('h4', { size: e.target.value })} />
              <input type="number" value={h4Weight} onChange={(e) => updateTypography('h4', { weight: String(e.target.value) })} />
            </div>

            <h4>Titre 5</h4>
            <div className={styles.typographyRow}>
              <select value={h5Family} onChange={(e) => updateTypography('h5', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={h5Size} placeholder="16px" onChange={(e) => updateTypography('h5', { size: e.target.value })} />
              <input type="number" value={h5Weight} onChange={(e) => updateTypography('h5', { weight: String(e.target.value) })} />
            </div>

            <h4>Paragraphe</h4>
            <div className={styles.typographyRow}>
              <select value={pFamily} onChange={(e) => updateTypography('p', { family: e.target.value })}>
                <option value="">(hérité)</option>
                <option value={'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>System</option>
                {fontOptions.map((fo: any) => <option key={fo.value} value={fo.value} style={{ fontFamily: fo.value }}>{fo.label}</option>)}
              </select>
              <input type="text" value={pSize} placeholder="16px" onChange={(e) => updateTypography('p', { size: e.target.value })} />
              <input type="number" value={pWeight} onChange={(e) => updateTypography('p', { weight: String(e.target.value) })} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
