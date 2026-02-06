"use client";
import React, { useEffect, useState } from 'react';
import styles from './FooterEditModal.module.css';

type MenuVisible = {
  realisation?: boolean;
  evenement?: boolean;
  corporate?: boolean;
  portrait?: boolean;
  animation?: boolean;
  galleries?: boolean;
  contact?: boolean;
  admin?: boolean;
};

import dynamic from 'next/dynamic';

const parseNumber = (v: any, def: number = 0) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

const safeJsonParse = <T>(v: string, def: T): T => {
  try {
    return JSON.parse(v);
  } catch {
    return def;
  }
};

const getStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

export default function FooterEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [col1, setCol1] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [menuVisible, setMenuVisible] = useState<MenuVisible>({ realisation: true, evenement: true, corporate: true, portrait: true, animation: true, galleries: true, contact: true, admin: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [openEditor, setOpenEditor] = useState<null | 'col1' | 'bottom'>(null);
  const [banner, setBanner] = useState<{ url?: string; path?: string } | null>(null);
  const [originalBannerPath, setOriginalBannerPath] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerFocal, setBannerFocal] = useState<{ x: number; y: number } | null>(null);
  const [bannerHeight, setBannerHeight] = useState<number | null>(null);
  // banner height limits (px)
  const MAX_BANNER_HEIGHT = 1600;
  const MIN_BANNER_HEIGHT = 60;


  useEffect(() => {
    let mounted = true;
    
    const parseBanner = (val: string | null) => {
      if (!val) return null;
      const parsed = safeJsonParse(val, null);
      if (parsed && typeof parsed === 'object' && (parsed.url || parsed.path)) {
        return { banner: { url: parsed.url, path: parsed.path }, original: parsed.path || null };
      }
      // If parsing failed or result is not the expected object, treat as simple string URL
      // But we need to distinguish if safeJsonParse returned null due to error or actual null
      // Re-implement logic slightly to match original behavior
      try {
        const p = JSON.parse(val);
        if (p && (p.url || p.path)) return { banner: { url: p.url, path: p.path }, original: p.path || null };
        if (typeof p === 'string') return { banner: { url: p }, original: null };
      } catch {}
      return { banner: { url: val }, original: null };
    };

    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=footerColumn1,footerBottomText,footerMenuVisible,footerBanner,footerBannerFocal,footerBannerHeight');
        if (resp.ok) {
          const j = await resp.json();
          const s = j?.settings || {};
          if (!mounted) return;

          setCol1(String(s.footerColumn1 || getStorage('footerColumn1') || ''));
          setBottomText(String(s.footerBottomText || getStorage('footerBottomText') || ''));
          
          const menuVis = s.footerMenuVisible || getStorage('footerMenuVisible');
          if (menuVis) setMenuVisible(safeJsonParse(String(menuVis), { realisation: true, evenement: true, corporate: true, portrait: true, animation: true, galleries: true, contact: true, admin: true }));

          const bannerVal = s.footerBanner || getStorage('footerBanner');
          if (bannerVal) {
            const res = parseBanner(String(bannerVal));
            if (res) { setBanner(res.banner as any); setOriginalBannerPath(res.original); }
          }

          const focalVal = s.footerBannerFocal || getStorage('footerBannerFocal');
          if (focalVal) {
            const f = safeJsonParse(String(focalVal), null) as any;
            if (f && typeof f.x === 'number' && typeof f.y === 'number') setBannerFocal({ x: parseNumber(f.x), y: parseNumber(f.y) });
          }

          const heightVal = s.footerBannerHeight || getStorage('footerBannerHeight');
          if (heightVal) setBannerHeight(parseNumber(heightVal, 0) || null);
          
          return;
        }
      } catch (_) {}

      // fallback if fetch fails
      if (!mounted) return;
      const v = getStorage('footerColumn1'); if (v) setCol1(v);
      const b = getStorage('footerBottomText'); if (b) setBottomText(b);
      const m = getStorage('footerMenuVisible'); if (m) setMenuVisible(safeJsonParse(m, { realisation: true, evenement: true, corporate: true, portrait: true, animation: true, galleries: true, contact: true, admin: true }));
      
      const vb = getStorage('footerBanner');
      if (vb) {
        const res = parseBanner(vb);
        if (res) { setBanner(res.banner as any); setOriginalBannerPath(res.original); }
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function toggleKey(key: keyof MenuVisible) {
    setMenuVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const [safeCol1, setSafeCol1] = useState<string | null>(null);
  const [safeBottom, setSafeBottom] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function sanitize() {
      try {
        const DOMPurify = (await import('dompurify')).default;
        if (!col1) { if (mounted) setSafeCol1(null); } else { if (mounted) setSafeCol1(DOMPurify.sanitize(col1)); }
        if (!bottomText) { if (mounted) setSafeBottom(null); } else { if (mounted) setSafeBottom(DOMPurify.sanitize(bottomText)); }
      } catch (_) { if (mounted) { setSafeCol1(null); setSafeBottom(null); } }
    }
    sanitize();
    return () => { mounted = false; };
  }, [col1, bottomText]);

  async function saveAll(overrides?: { col1?: string; bottom?: string; menuVisible?: MenuVisible; closeOnSuccess?: boolean }) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // save keys to server (one-by-one) - API expects {key,value}
      const payloadCol1 = typeof overrides?.col1 === 'string' ? overrides.col1 : col1;
      const payloadBottom = typeof overrides?.bottom === 'string' ? overrides.bottom : bottomText;
      const payloadMenu = overrides?.menuVisible ?? menuVisible;

      const tasks = [
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerColumn1', value: payloadCol1 }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerBottomText', value: payloadBottom }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerMenuVisible', value: JSON.stringify(payloadMenu) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerBanner', value: JSON.stringify(banner || '') }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerBannerFocal', value: JSON.stringify(bannerFocal || '') }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerBannerHeight', value: bannerHeight || '' }) })
      ];



      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }

      setOriginalBannerPath(banner?.path || null);

      // persist locally so UI updates immediately
      setStorage('footerColumn1', String(payloadCol1 ?? ''));
      setStorage('footerBottomText', String(payloadBottom ?? ''));
      setStorage('footerMenuVisible', JSON.stringify(payloadMenu));
      setStorage('footerBanner', JSON.stringify(banner || ''));
      setStorage('footerBannerFocal', JSON.stringify(bannerFocal || ''));
      setStorage('footerBannerHeight', String(bannerHeight || ''));

      // dispatch custom event so in-page components update immediately
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'footerBanner', value: JSON.stringify(banner || ''), url: (banner && banner.url) ? banner.url : undefined, path: (banner && banner.path) ? banner.path : undefined } })); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'footerBannerFocal', value: JSON.stringify(bannerFocal || '') } })); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'footerBannerHeight', value: String(bannerHeight || '') } })); } catch(_){ }

      setSuccess('Sauvegardé');
      if (onSaved) onSaved();
      // close after short delay to show success (unless caller asked to keep open)
      if (overrides?.closeOnSuccess !== false) {
        setTimeout(() => onClose(), 500);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleBannerSelect(file: File | null) {
    if (!file) return;
    setUploadingBanner(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'footer-banner');
      const currentPath = banner?.path || originalBannerPath;
      if (currentPath) fd.append('old_path', currentPath);
      const resp = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Erreur d\u2019upload');
      const j = await resp.json();
      if (j?.webp) {
        setBanner({ url: String(j.webp), path: String(j.path || '') });
        setOriginalBannerPath(j.path ? String(j.path) : null);
      } else {
        throw new Error('Upload: pas d\u2019URL retourn\u00e9e');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur');
      throw err;
    } finally {
      setUploadingBanner(false);
    }
  }

  async function removeBanner() {
    if (!banner?.path) { setBanner(null); setOriginalBannerPath(null); setBannerFocal(null); setBannerHeight(null); return; }
    setError(null);
    try {
      const resp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: banner.path }) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || `Erreur suppression fichier (${resp.status})`);
      setBanner(null);
      setOriginalBannerPath(null);
      setBannerFocal(null);
      setBannerHeight(null);
    } catch (err: any) {
      setError(err?.message || 'Erreur suppression');
    }
  }

  async function doSave() {
    await saveAll();
  }

  const currentBannerHeight = bannerHeight ?? 160;
  const bannerInputValue = bannerHeight ?? '';

  const clampHeight = (v: number) => Math.max(MIN_BANNER_HEIGHT, Math.min(MAX_BANNER_HEIGHT, v));

  return (
    <div className={`${styles.overlay} modal-overlay-mobile`}>
      <div className={styles.modal}>
        <h3 style={{ marginTop: 0 }}>Modifier le footer</h3>
        <div className={styles.modalBody}>
        <div className={styles.grid}>
          <div className={styles.colLeft}>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Colonne 1 (texte libre)</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 110, padding: 8 }}>
              <div style={{ minHeight: 80 }}>
                  <div className="footer-edit-preview" dangerouslySetInnerHTML={{ __html: safeCol1 || '<p style="color: #999">Aucun contenu</p>' }} />
                </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => setOpenEditor('col1')}>Éditer</button>
              </div>

              <div style={{ height: 12 }} />
              <label style={{ fontSize: 13, color: 'var(--muted)' }}>Bannière (au dessus du footer)</label>
              <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 80, padding: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: 'column' }}>
                <div className={styles.bannerFileRow}>
                  <input type="file" accept="image/*" onChange={async (e) => { const f = (e.target.files && e.target.files[0]) || null; if (f) await handleBannerSelect(f); }} />
                  {uploadingBanner ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>Téléchargement…</div> : null}
                  {banner?.url ? <button className="btn-secondary" onClick={removeBanner}>Supprimer</button> : null}
                </div>

                <div style={{ marginTop: 8 }}>
                  {banner?.url ? (
                    <>
                      <div
                        onClick={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          const rect = el.getBoundingClientRect();
                          const x = ((e as any).clientX - rect.left) / rect.width;
                          const y = ((e as any).clientY - rect.top) / rect.height;
                          const px = Math.round(Math.max(0, Math.min(100, x * 100)));
                          const py = Math.round(Math.max(0, Math.min(100, y * 100)));
                          setBannerFocal({ x: px, y: py });
                        }}
                        style={{ width: 320, maxWidth: '100%', height: 160, borderRadius: 6, backgroundImage: `url(${String(banner.url)})`, backgroundSize: 'cover', backgroundPosition: (bannerFocal ? `${bannerFocal.x}% ${bannerFocal.y}%` : 'center'), cursor: 'crosshair', position: 'relative' }}
                      >
                        {bannerFocal ? (
                          <div style={{ position: 'absolute', left: `calc(${bannerFocal.x}% - 8px)`, top: `calc(${bannerFocal.y}% - 8px)`, width: 16, height: 16, borderRadius: 999, background: '#fff', border: '2px solid rgba(0,0,0,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        ) : null}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Cliquez sur l'image pour définir le point focal</div>
                    </>
                  ) : (
                    <div style={{ width: 320, maxWidth: '100%', height: 160, borderRadius: 6, background: '#f7f8f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Aucun aperçu</div>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>
            <div className={styles.colRight}>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Texte bas de page (copyright)</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 80, padding: 8 }}>
              <div style={{ minHeight: 40 }}>
                <div className="footer-edit-preview" dangerouslySetInnerHTML={{ __html: safeBottom || '<p style="color: #999">Aucun contenu</p>' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => setOpenEditor('bottom')}>Éditer</button>
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ height: 12 }} />
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Import & aperçu dans la zone de gauche</div>
            <div style={{ height: 12 }} />

            <label className={styles.bannerHeightLabel}>Hauteur bannière (px)</label>
            <div className={styles.bannerHeightBlock}>
              <div className={styles.bannerHeightRow}>
                <input
                  type="range"
                  min={MIN_BANNER_HEIGHT}
                  max={MAX_BANNER_HEIGHT}
                  value={currentBannerHeight}
                  onChange={(e) => setBannerHeight(clampHeight(Number(e.target.value) || 0))}
                  className={styles.bannerHeightSlider}
                />
                <input
                  type="number"
                  min={MIN_BANNER_HEIGHT}
                  max={MAX_BANNER_HEIGHT}
                  value={bannerInputValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setBannerHeight(null); return; }
                    const v = Number(raw);
                    if (Number.isNaN(v)) { setBannerHeight(null); return; }
                    setBannerHeight(clampHeight(v));
                  }}
                  className={styles.bannerHeightInput}
                />
              </div>
              <div className={styles.bannerHeightActions}>
                <button className="btn-ghost" onClick={() => setBannerHeight(null)}>Réinitialiser</button>
                <span className={styles.bannerHeightValue}>Valeur appliquée: {bannerHeight ? `${bannerHeight}px` : 'par défaut'}</span>
              </div>
            </div>

            <div className={styles.visiblePanel}>
              <div className={styles.visiblePanelTitle}>Éléments visibles</div>
              <div className={styles.visiblePanelGrid}>
                {(['realisation','evenement','corporate','portrait','animation','galleries','contact','admin'] as (keyof MenuVisible)[]).map((k) => (
                  <label key={k} className={styles.visiblePanelLabel}>
                    <input type="checkbox" checked={!!menuVisible?.[k]} onChange={() => toggleKey(k)} />
                    <span>{k}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>
        </div>

        <div className={styles.actions}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button onClick={doSave} className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>

        {error ? <div style={{ marginTop: 8, color: 'red' }}>{error}</div> : null}
        {success ? <div style={{ marginTop: 8, color: 'green' }}>{success}</div> : null}

        {openEditor === 'col1' ? (
          <React.Suspense fallback={null}>
            {/* dynamic import inside client is handled by next/dynamic in RichTextModal */}
            <RichTextModal title="Éditer la colonne 1" initial={col1} onClose={() => setOpenEditor(null)} onSave={async (html) => { setCol1(html); setOpenEditor(null); await saveAll({ col1: html, closeOnSuccess: false }); }} />
          </React.Suspense>
        ) : null}

        {openEditor === 'bottom' ? (
          <React.Suspense fallback={null}>
            <RichTextModal title="Éditer le texte bas" initial={bottomText} onClose={() => setOpenEditor(null)} onSave={async (html) => { setBottomText(html); setOpenEditor(null); await saveAll({ bottom: html, closeOnSuccess: false }); }} />
          </React.Suspense>
        ) : null}

      </div>
    </div>
  );
}
