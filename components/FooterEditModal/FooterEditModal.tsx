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


  useEffect(() => {
    let mounted = true;
    async function load() {
      // prefer server settings, fallback to localStorage
      try {
        const resp = await fetch('/api/admin/site-settings?keys=footerColumn1,footerBottomText,footerMenuVisible');
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
          }
          return;
        }
      } catch (_) {}

      // fallback
      try { const v = localStorage.getItem('footerColumn1'); if (v) setCol1(v); } catch(_){}
      try { const b = localStorage.getItem('footerBottomText'); if (b) setBottomText(b); } catch(_){}
      try { const m = localStorage.getItem('footerMenuVisible'); if (m) setMenuVisible(JSON.parse(m)); } catch(_){}
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
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'footerMenuVisible', value: JSON.stringify(payloadMenu) }) })
      ];

      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }

      // persist locally so UI updates immediately
      try { localStorage.setItem('footerColumn1', String(payloadCol1 ?? '')); } catch(_){ }
      try { localStorage.setItem('footerBottomText', String(payloadBottom ?? '')); } catch(_){ }
      try { localStorage.setItem('footerMenuVisible', JSON.stringify(payloadMenu)); } catch(_){ }

      // dispatch custom event so in-page components update immediately
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch(_){}

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

  async function doSave() {
    await saveAll();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="footer-edit-modal" style={{ position: 'relative', background: '#fff', color: '#000', padding: 20, width: 680, maxWidth: '95%', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Modifier le footer</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Colonne 1 (texte libre)</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 110, padding: 8 }}>
              <div style={{ minHeight: 80 }}>
                  <div className="footer-edit-preview" dangerouslySetInnerHTML={{ __html: safeCol1 || '<p style="color: #999">Aucun contenu</p>' }} />
                </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-ghost" onClick={() => setOpenEditor('col1')}>Éditer</button>
              </div>
            </div>
          </div>
            <div className="footer-right-col" style={{ width: 320 }}>
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
