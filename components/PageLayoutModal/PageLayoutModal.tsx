"use client";

import React, { useEffect, useState } from 'react';

type LayoutSection = {
  containerMaxWidth: number;
  /** Largeur max. de la zone contenu (texte / blocs) à l’intérieur du corps. */
  contentInnerMaxWidth: number;
  /** Hauteur min. de la zone contenu (px) — 0 = pas de minimum. */
  contentInnerMinHeight: number;
  blockInnerPadding: number;
  marginHorizontal: number;
  marginVertical: number;
  sectionGap: number;
};

const defaultDesktop: LayoutSection = {
  containerMaxWidth: 1200,
  contentInnerMaxWidth: 2000,
  contentInnerMinHeight: 0,
  blockInnerPadding: 24,
  marginHorizontal: 24,
  marginVertical: 0,
  sectionGap: 48,
};

const defaultMobile: LayoutSection = {
  containerMaxWidth: 1000,
  contentInnerMaxWidth: 1200,
  contentInnerMinHeight: 0,
  blockInnerPadding: 16,
  marginHorizontal: 16,
  marginVertical: 0,
  sectionGap: 32,
};

export default function PageLayoutModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [desktop, setDesktop] = useState<LayoutSection>(defaultDesktop);
  const [mobile, setMobile] = useState<LayoutSection>(defaultMobile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/page-layout')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setDesktop({ ...defaultDesktop, ...data.desktop });
        setMobile({ ...defaultMobile, ...data.mobile });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  function updateDesktop(k: keyof LayoutSection, v: number) {
    setDesktop((s) => ({ ...s, [k]: v }));
  }
  function updateMobile(k: keyof LayoutSection, v: number) {
    setMobile((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const value = JSON.stringify({ desktop, mobile });
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'page_layout', value }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as any).error || 'Erreur sauvegarde');
      }
      applyVars(desktop, mobile);
      try {
        window.dispatchEvent(new CustomEvent('page-layout-updated', { detail: { desktop, mobile } }));
      } catch (_) {}
      setMessage('Enregistré');
      onSaved?.();
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      setMessage(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', color: '#000', padding: 24, width: 560, maxWidth: 'calc(100% - 24px)', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>Dimensions & mise en page</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <section style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bureau</h4>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Largeur max. du corps de la page (px)</label>
              <input type="number" min={800} max={2000} value={desktop.containerMaxWidth} onChange={(e) => updateDesktop('containerMaxWidth', Number(e.target.value) || 1200)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Largeur max. de la zone contenu / texte (px)</label>
              <input type="number" min={560} max={2400} value={desktop.contentInnerMaxWidth} onChange={(e) => updateDesktop('contentInnerMaxWidth', Number(e.target.value) || 2000)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Hauteur min. de la zone contenu (px, 0 = pas de min)</label>
              <input type="number" min={0} max={2000} value={desktop.contentInnerMinHeight} onChange={(e) => updateDesktop('contentInnerMinHeight', Math.max(0, Number(e.target.value) || 0))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Marge intérieure des blocs (px)</label>
              <input type="number" min={0} max={120} value={desktop.blockInnerPadding} onChange={(e) => updateDesktop('blockInnerPadding', Math.max(0, Number(e.target.value) ?? 24))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Marge horizontale (px)</label>
              <input type="number" min={0} max={80} value={desktop.marginHorizontal} onChange={(e) => updateDesktop('marginHorizontal', Number(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Espace entre sections (px)</label>
              <input type="number" min={0} max={120} value={desktop.sectionGap} onChange={(e) => updateDesktop('sectionGap', Number(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile</h4>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Largeur max. du corps de la page (px)</label>
              <input type="number" min={280} max={1200} value={mobile.containerMaxWidth} onChange={(e) => updateMobile('containerMaxWidth', Number(e.target.value) || 1000)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Largeur max. de la zone contenu / texte (px)</label>
              <input type="number" min={280} max={1400} value={mobile.contentInnerMaxWidth} onChange={(e) => updateMobile('contentInnerMaxWidth', Number(e.target.value) || 1200)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Hauteur min. de la zone contenu (px, 0 = pas de min)</label>
              <input type="number" min={0} max={1200} value={mobile.contentInnerMinHeight} onChange={(e) => updateMobile('contentInnerMinHeight', Math.max(0, Number(e.target.value) || 0))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Marge intérieure des blocs (px)</label>
              <input type="number" min={0} max={80} value={mobile.blockInnerPadding} onChange={(e) => updateMobile('blockInnerPadding', Math.max(0, Number(e.target.value) ?? 16))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Marge horizontale (px)</label>
              <input type="number" min={0} max={48} value={mobile.marginHorizontal} onChange={(e) => updateMobile('marginHorizontal', Number(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Espace entre sections (px)</label>
              <input type="number" min={0} max={80} value={mobile.sectionGap} onChange={(e) => updateMobile('sectionGap', Number(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
          </div>
        </section>

        {message && <div style={{ marginBottom: 12, fontSize: 13, color: message === 'Enregistré' ? '#166534' : '#b91c1c' }}>{message}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>Annuler</button>
          <button type="button" onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}

function applyVars(desktop: LayoutSection, mobile: LayoutSection): void {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (!root) return;
  root.style.setProperty('--container-max-width-desktop', `${desktop.containerMaxWidth}px`);
  root.style.setProperty('--content-inner-max-width-desktop', `${desktop.contentInnerMaxWidth}px`);
  root.style.setProperty('--content-inner-min-height-desktop', `${desktop.contentInnerMinHeight ?? 0}px`);
  root.style.setProperty('--block-inner-padding-desktop', `${desktop.blockInnerPadding ?? 24}px`);
  root.style.setProperty('--container-margin-x-desktop', `${desktop.marginHorizontal}px`);
  root.style.setProperty('--section-gap-desktop', `${desktop.sectionGap}px`);
  root.style.setProperty('--container-max-width-mobile', `${mobile.containerMaxWidth}px`);
  root.style.setProperty('--content-inner-max-width-mobile', `${mobile.contentInnerMaxWidth}px`);
  root.style.setProperty('--content-inner-min-height-mobile', `${mobile.contentInnerMinHeight ?? 0}px`);
  root.style.setProperty('--block-inner-padding-mobile', `${mobile.blockInnerPadding ?? 16}px`);
  root.style.setProperty('--container-margin-x-mobile', `${mobile.marginHorizontal}px`);
  root.style.setProperty('--section-gap-mobile', `${mobile.sectionGap}px`);
}

export { applyVars };
