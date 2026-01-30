"use client";
import React, { useEffect, useState } from 'react';

type MenuVisible = {
  realisation?: boolean;
  evenement?: boolean;
  corporate?: boolean;
  portrait?: boolean;
  galleries?: boolean;
  contact?: boolean;
  admin?: boolean;
};

import dynamic from 'next/dynamic';

const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

export default function FooterEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [col1, setCol1] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [menuVisible, setMenuVisible] = useState<MenuVisible>({ realisation: true, evenement: true, corporate: true, portrait: true, galleries: true, contact: true, admin: true });
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
    async function load() {
      // prefer server settings, fallback to localStorage
      try {
        const resp = await fetch('/api/admin/site-settings?keys=footerColumn1,footerBottomText,footerMenuVisible,footerBanner,footerBannerFocal,footerBannerHeight');
        if (resp.ok) {
          const j = await resp.json();
          const s = j?.settings || {};
          if (mounted) {
            if (s.footerColumn1) setCol1(String(s.footerColumn1)); else {
              try { const v = localStorage.getItem('footerColumn1'); if (v) setCol1(v); } catch(_){}
            }
            if (s.footerBottomText) setBottomText(String(s.footerBottomText)); else { try { const v = localStorage.getItem('footerBottomText'); if (v) setBottomText(v); } catch(_){} }
            if (s.footerMenuVisible) {
              try { setMenuVisible(JSON.parse(String(s.footerMenuVisible))); } catch(_) {}
            } else {
              try { const v = localStorage.getItem('footerMenuVisible'); if (v) setMenuVisible(JSON.parse(v)); } catch(_) {}
            }

            if (s.footerBanner) {
              try {
                const parsed = JSON.parse(String(s.footerBanner));
                if (parsed && (parsed.url || parsed.path)) { setBanner({ url: parsed.url, path: parsed.path }); setOriginalBannerPath(parsed.path || null); }
                else if (typeof parsed === 'string') { setBanner({ url: parsed }); setOriginalBannerPath(null); }
              } catch (e) { setBanner({ url: String(s.footerBanner) }); setOriginalBannerPath(null); }
            } else {
              try { const vb = localStorage.getItem('footerBanner'); if (vb) { const parsed = JSON.parse(vb); if (parsed && (parsed.url || parsed.path)) { setBanner({ url: parsed.url, path: parsed.path }); setOriginalBannerPath(parsed.path || null); } else { setBanner({ url: String(vb) }); setOriginalBannerPath(null); } } } catch(_){}
            }
            if (s.footerBannerFocal) {
              try { const f = JSON.parse(String(s.footerBannerFocal)); if (f && typeof f.x === 'number' && typeof f.y === 'number') setBannerFocal({ x: Number(f.x), y: Number(f.y) }); } catch(_) {}
            } else {
              try { const vf = localStorage.getItem('footerBannerFocal'); if (vf) { const p = JSON.parse(vf); if (p && typeof p.x === 'number' && typeof p.y === 'number') setBannerFocal({ x: Number(p.x), y: Number(p.y) }); } } catch(_) {}
            }

            if (s.footerBannerHeight) {
              try { setBannerHeight(Number(s.footerBannerHeight)); } catch(_) {}
            } else {
              try { const vh = localStorage.getItem('footerBannerHeight'); if (vh) setBannerHeight(Number(vh)); } catch(_) {}
            }          }
          return;
        }
      } catch (_) {}

      // fallback
      try { const v = localStorage.getItem('footerColumn1'); if (v) setCol1(v); } catch(_){}
      try { const b = localStorage.getItem('footerBottomText'); if (b) setBottomText(b); } catch(_){}
      try { const m = localStorage.getItem('footerMenuVisible'); if (m) setMenuVisible(JSON.parse(m)); } catch(_){}      try { const vb = localStorage.getItem('footerBanner'); if (vb) { const parsed = JSON.parse(vb); if (parsed && (parsed.url || parsed.path)) { setBanner({ url: parsed.url, path: parsed.path }); setOriginalBannerPath(parsed.path || null); } else setBanner({ url: String(vb) }); } } catch(_){ }    }
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

      // If we replaced a stored banner, attempt to delete the previous stored file
      if (originalBannerPath && originalBannerPath !== (banner?.path || null)) {
        try {
          const dresp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: originalBannerPath }) });
          if (!dresp.ok) {
            const dj = await dresp.json().catch(() => ({}));
            console.warn('Failed to delete old footer banner', dj);
            setError(`Attention: suppression ancienne bannière a échoué (${dj?.error || dresp.status})`);
          } else {
            setOriginalBannerPath(banner?.path || null);
          }
        } catch (e) {
          console.warn('Failed to delete old footer banner', e);
          setError('Attention: suppression ancienne bannière a échoué');
        }
      } else {
        setOriginalBannerPath(banner?.path || null);
      }

      // If we replaced a stored banner, attempt to delete the previous stored file
      if (originalBannerPath && originalBannerPath !== (banner?.path || null)) {
        try {
          const dresp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: originalBannerPath }) });
          if (!dresp.ok) {
            const dj = await dresp.json().catch(() => ({}));
            console.warn('Failed to delete old footer banner', dj);
            setError(`Attention: suppression ancienne bannière a échoué (${dj?.error || dresp.status})`);
          } else {
            setOriginalBannerPath(banner?.path || null);
          }
        } catch (e) {
          console.warn('Failed to delete old footer banner', e);
          setError('Attention: suppression ancienne bannière a échoué');
        }
      } else {
        setOriginalBannerPath(banner?.path || null);
      }

      // persist locally so UI updates immediately
      try { localStorage.setItem('footerColumn1', String(payloadCol1 ?? '')); } catch(_){ }
      try { localStorage.setItem('footerBottomText', String(payloadBottom ?? '')); } catch(_){ }
      try { localStorage.setItem('footerMenuVisible', JSON.stringify(payloadMenu)); } catch(_){ }
      try { localStorage.setItem('footerBanner', JSON.stringify(banner || '')); } catch(_){ }
      try { localStorage.setItem('footerBannerFocal', JSON.stringify(bannerFocal || '')); } catch(_){ }
      try { localStorage.setItem('footerBannerHeight', String(bannerHeight || '')); } catch(_){ }

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
      const resp = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Erreur d\u2019upload');
      const j = await resp.json();
      if (j?.webp) {
        setBanner({ url: String(j.webp), path: String(j.path || '') });
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="footer-edit-modal" style={{ position: 'relative', background: '#fff', color: '#000', padding: 24, width: 920, minWidth: 760, maxWidth: '98%', borderRadius: 8, boxSizing: 'border-box' }}>
        <h3 style={{ marginTop: 0 }}>Modifier le footer</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={async (e) => { const f = (e.target.files && e.target.files[0]) || null; if (f) await handleBannerSelect(f); }} />
                  {uploadingBanner ? <div style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}>Téléchargement…</div> : null}
                  {banner?.url ? <div style={{ marginLeft: 8 }}><button className="btn-secondary" onClick={removeBanner}>Supprimer</button></div> : null}
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
            <div className="footer-right-col" style={{ width: 360, minWidth: 280 }}>
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

            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Hauteur bannière (px)</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 80, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="range"
                  min={MIN_BANNER_HEIGHT}
                  max={MAX_BANNER_HEIGHT}
                  value={bannerHeight ?? 160}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    const clamped = Math.max(MIN_BANNER_HEIGHT, Math.min(MAX_BANNER_HEIGHT, v));
                    setBannerHeight(clamped);
                  }}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min={MIN_BANNER_HEIGHT}
                  max={MAX_BANNER_HEIGHT}
                  value={bannerHeight ?? 160}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setBannerHeight(null); return; }
                    const v = Number(raw);
                    if (Number.isNaN(v)) { setBannerHeight(null); return; }
                    const clamped = Math.max(MIN_BANNER_HEIGHT, Math.min(MAX_BANNER_HEIGHT, v));
                    setBannerHeight(clamped);
                  }}
                  style={{ width: 100, padding: '6px 8px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-ghost" onClick={() => setBannerHeight(null)}>Réinitialiser</button>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Valeur appliquée: {bannerHeight ? `${bannerHeight}px` : 'par défaut'}</div>
              </div>
            </div>

            {/* Elements visible moved to floating panel at bottom-right */}
          </div>
        </div>

        <div className="footer-modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button onClick={doSave} className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>

        {/* Floating visible elements panel */}
        <div className="footer-visible-panel">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Éléments visibles</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {(['realisation','evenement','corporate','portrait','galleries','contact','admin'] as (keyof MenuVisible)[]).map((k) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!menuVisible?.[k]} onChange={() => toggleKey(k)} />
                <span style={{ textTransform: 'capitalize' }}>{k}</span>
              </label>
            ))}
          </div>
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
