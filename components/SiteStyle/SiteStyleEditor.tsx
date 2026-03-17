"use client";
import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import styles from './SiteStyle.module.css';
import ModalTabs from '../ui/ModalTabs';
import { useSiteStyle } from './SiteStyleProvider';
import type { SiteStyle, BackgroundStyle } from './SiteStyleProvider';

export default function SiteStyleEditor({ onClose }: { onClose: () => void }) {
  const { style, setStyle, saveStyle } = useSiteStyle();
  const [tab, setTab] = useState<'colors'|'typography'|'background'>('colors');
  const [uploadingBg, setUploadingBg] = useState(false);
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

  function updateBackground(next: Partial<any>) {
    setLocal((s) => ({ ...s, background: { ...(s.background || {}), ...next } }));
  }

  async function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingBg(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('page', 'site');
      fd.append('kind', 'image');
      fd.append('folder', 'site/backgrounds');
      const resp = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Upload failed');
      const url = json?.url;
      if (!url) throw new Error('No url returned');
      updateBackground({ imageUrl: url, style: 'custom' });
      setMessage('Image importée');
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setUploadingBg(false);
    }
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
      <ModalTabs
        tabs={[
          { id: 'colors', label: 'Couleurs' },
          { id: 'typography', label: 'Typographie' },
          { id: 'background', label: 'Fond' },
        ]}
        active={tab}
        onChange={(t) => setTab(t as any)}
      />

      {tab === 'colors' && (
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
      )}

      {tab === 'typography' && (
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

      {tab === 'background' && (() => {
        const bgStyle = (local.background?.style || 'none') as BackgroundStyle;
        const bgOpacity = local.background?.opacity != null ? local.background.opacity : 0.08;
        const bgImageUrl = local.background?.imageUrl || '';
        const bgImageMode = local.background?.imageMode || 'repeat';

        const presets: { value: BackgroundStyle; label: string; desc: string }[] = [
          { value: 'none', label: 'Aucun', desc: 'Fond uni sans effet' },
          { value: 'grain', label: 'Grain', desc: 'Texture granuleuse subtile, effet argentique' },
          { value: 'dots', label: 'Points', desc: 'Grille de micro-points, style minimaliste' },
          { value: 'lines', label: 'Lignes', desc: 'Hachures diagonales discrètes, style graphique' },
          { value: 'custom', label: 'Image personnalisée', desc: 'Importez votre propre texture ou motif' },
        ];

        return (
          <div className={styles.panel}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              L'effet de fond s'applique par-dessus les couleurs de blocs, comme une texture visible sur toute la page.
            </p>

            {/* Style selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
              {presets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => updateBackground({ style: p.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `2px solid ${bgStyle === p.value ? 'var(--fg, #111)' : '#e6e6e6'}`,
                    background: bgStyle === p.value ? 'var(--fg, #111)' : '#fff',
                    color: bgStyle === p.value ? '#fff' : 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Opacity slider */}
            {bgStyle !== 'none' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>Opacité de l'effet</span>
                  <span style={{ fontWeight: 600, color: 'inherit' }}>{Math.round(bgOpacity * 100)}%</span>
                </label>
                <input
                  type="range" min={0} max={0.4} step={0.01}
                  value={bgOpacity}
                  onChange={(e) => updateBackground({ opacity: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--fg, #111)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  <span>Invisible</span><span>Très visible</span>
                </div>
              </div>
            )}

            {/* Custom image options */}
            {bgStyle === 'custom' && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: 14, marginTop: 4 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Importer une image de fond</label>
                  <input type="file" accept="image/*" onChange={handleBgImageUpload} disabled={uploadingBg} />
                  {uploadingBg && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Upload…</span>}
                  {bgImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <img src={bgImageUrl} alt="" style={{ maxWidth: 160, maxHeight: 80, borderRadius: 6, objectFit: 'cover', border: '1px solid #eee' }} />
                      <button type="button" style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => updateBackground({ imageUrl: '' })}>Supprimer l'image</button>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Mode d'affichage</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([{ value: 'repeat', label: 'Motif répété' }, { value: 'fixed', label: 'Image fixe (site défile)' }] as const).map(opt => (
                      <button key={opt.value} type="button" onClick={() => updateBackground({ imageMode: opt.value })}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e6e6e6', fontSize: 13, cursor: 'pointer', background: bgImageMode === opt.value ? '#111' : '#fff', color: bgImageMode === opt.value ? '#fff' : 'inherit' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {message && <div style={{ fontSize: 13, marginTop: 8, color: message.includes('mportée') ? 'green' : '#dc2626' }}>{message}</div>}
          </div>
        );
      })()}
    </Modal>
  );
}
