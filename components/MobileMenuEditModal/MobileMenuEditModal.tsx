"use client";
import React, { useEffect, useState } from 'react';

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

export default function MobileMenuEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [menuVisible, setMenuVisible] = useState<MenuVisible>({ realisation: true, evenement: true, corporate: true, portrait: true, animation: true, galleries: true, contact: true, admin: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fontFamily, setFontFamily] = useState<string>(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('navMobileFontFamily') || '') : ''; } catch(_) { return ''; }
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    try { return typeof window !== 'undefined' ? Number(localStorage.getItem('navMobileFontSize') || '16') : 16; } catch(_) { return 16; }
  });
  const [fontWeight, setFontWeight] = useState<number>(() => {
    try { return typeof window !== 'undefined' ? Number(localStorage.getItem('navMobileFontWeight') || '600') : 600; } catch(_) { return 600; }
  });
  const [textColor, setTextColor] = useState<string>(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('navMobileTextColor') || '') : ''; } catch(_) { return ''; }
  });
  const [hoverColor, setHoverColor] = useState<string>(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('navMobileHoverTextColor') || '') : ''; } catch(_) { return ''; }
  });
  const [activeColor, setActiveColor] = useState<string>(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('navMobileActiveTextColor') || '') : ''; } catch(_) { return ''; }
  });
  const [bgColor, setBgColor] = useState<string>(() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('navMobileBgColor') || '') : ''; } catch(_) { return ''; }
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=navMobileFontFamily,navMobileFontSize,navMobileFontWeight,navMobileTextColor,navMobileHoverTextColor,navMobileActiveTextColor,navMobileBgColor,navMobileMenuVisible');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.navMobileFontFamily) { setFontFamily(String(s.navMobileFontFamily)); try { localStorage.setItem('navMobileFontFamily', String(s.navMobileFontFamily)); } catch(_){} }
        if (s.navMobileFontSize) { const v = Number(s.navMobileFontSize) || 16; setFontSize(v); try{ localStorage.setItem('navMobileFontSize', String(v)); }catch(_){} }
        if (s.navMobileFontWeight) { const w = Number(s.navMobileFontWeight) || 600; setFontWeight(w); try{ localStorage.setItem('navMobileFontWeight', String(w)); }catch(_){} }
        if (s.navMobileTextColor) { setTextColor(String(s.navMobileTextColor)); try{ localStorage.setItem('navMobileTextColor', String(s.navMobileTextColor)); }catch(_){} }
        if (s.navMobileHoverTextColor) { setHoverColor(String(s.navMobileHoverTextColor)); try{ localStorage.setItem('navMobileHoverTextColor', String(s.navMobileHoverTextColor)); }catch(_){} }
        if (s.navMobileActiveTextColor) { setActiveColor(String(s.navMobileActiveTextColor)); try{ localStorage.setItem('navMobileActiveTextColor', String(s.navMobileActiveTextColor)); }catch(_){} }
        if (s.navMobileBgColor) { setBgColor(String(s.navMobileBgColor)); try{ localStorage.setItem('navMobileBgColor', String(s.navMobileBgColor)); }catch(_){} }
        if (s.navMobileMenuVisible) { try { setMenuVisible(JSON.parse(String(s.navMobileMenuVisible))); } catch(_) {} }
      } catch (_) {}
    }
    load();
    return () => { mounted = false; };
  }, []);

  function toggleKey(key: keyof MenuVisible) {
    setMenuVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function applyLocalAndCss() {
    try { document.documentElement.style.setProperty('--nav-mobile-font-family', fontFamily || ''); } catch(_){ }
    try { document.documentElement.style.setProperty('--nav-mobile-font-size', `${fontSize}px`); } catch(_){ }
    try { document.documentElement.style.setProperty('--nav-mobile-font-weight', String(fontWeight)); } catch(_){ }
    try { document.documentElement.style.setProperty('--nav-mobile-text-color', textColor || ''); } catch(_){ }
    try { document.documentElement.style.setProperty('--nav-mobile-hover-text-color', hoverColor || ''); } catch(_){ }
    try { document.documentElement.style.setProperty('--nav-mobile-active-text-color', activeColor || ''); } catch(_){ }
    try { document.documentElement.style.setProperty('--nav-mobile-bg-color', bgColor || ''); } catch(_){ }
    try { localStorage.setItem('navMobileFontFamily', fontFamily || ''); } catch(_){ }
    try { localStorage.setItem('navMobileFontSize', String(fontSize)); } catch(_){ }
    try { localStorage.setItem('navMobileFontWeight', String(fontWeight)); } catch(_){ }
    try { localStorage.setItem('navMobileTextColor', textColor || ''); } catch(_){ }
    try { localStorage.setItem('navMobileHoverTextColor', hoverColor || ''); } catch(_){ }
    try { localStorage.setItem('navMobileActiveTextColor', activeColor || ''); } catch(_){ }
    try { localStorage.setItem('navMobileBgColor', bgColor || ''); } catch(_){ }
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      applyLocalAndCss();
      const tasks = [
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileFontFamily', value: fontFamily }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileFontSize', value: String(fontSize) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileFontWeight', value: String(fontWeight) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileTextColor', value: textColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileHoverTextColor', value: hoverColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileActiveTextColor', value: activeColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileBgColor', value: bgColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMobileMenuVisible', value: JSON.stringify(menuVisible) }) })
      ];

      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }

      try { localStorage.setItem('navMobileMenuVisible', JSON.stringify(menuVisible)); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch(_){ }

      setSuccess('Sauvegardé');
      if (onSaved) onSaved();
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const navItems: { key: keyof MenuVisible; label: string }[] = [
    { key: 'realisation', label: 'Réalisation' },
    { key: 'evenement', label: 'Évènement' },
    { key: 'corporate', label: 'Corporate' },
    { key: 'portrait', label: 'Portrait' },
    { key: 'animation', label: 'Animation' },
    { key: 'galleries', label: 'Galeries' },
    { key: 'contact', label: 'Contact' },
    { key: 'admin', label: 'Admin' }
  ];

  return (
    <div className="modal-overlay-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', color: '#000', padding: 20, width: 760, maxWidth: '98%', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto', borderRadius: 8, position: 'relative' }}>
        <h3 style={{ marginTop: 0 }}>Modifier le menu mobile</h3>

        <div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Aperçu</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 100, padding: 8 }}>
              <nav style={{ display: 'flex', gap: 'var(--nav-mobile-gap, 0.6rem)', alignItems: 'center', fontFamily: fontFamily || 'inherit', fontSize: `${fontSize}px`, fontWeight: fontWeight as any, background: bgColor || 'transparent', padding: '8px' }}>
                {navItems.filter(item => !!menuVisible?.[item.key]).map((item) => (
                  <div key={item.key} style={{ padding: '6px 10px', borderRadius: 4 }}>{item.label}</div>
                ))}
              </nav>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Paramètres des boutons</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Police</div>
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} style={{ width: '100%', marginTop: 6 }}>
                    <option value="">Inter (site par défaut)</option>
                    <option value="Playfair Display, serif">Playfair Display</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Arial, sans-serif">Arial</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Taille police</div>
                  <input type="range" min={12} max={24} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
                  <div style={{ fontSize: 13, marginTop: 6 }}>{fontSize}px</div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Épaisseur</div>
                  <select value={fontWeight} onChange={(e) => setFontWeight(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }}>
                    <option value={400}>400</option>
                    <option value={500}>500</option>
                    <option value={600}>600</option>
                    <option value={700}>700</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Couleur texte</div>
                  <input type="color" value={textColor || '#000000'} onChange={(e) => setTextColor(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Couleur texte au survol</div>
                  <input type="color" value={hoverColor || '#000000'} onChange={(e) => setHoverColor(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Couleur texte actif</div>
                  <input type="color" value={activeColor || '#000000'} onChange={(e) => setActiveColor(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Couleur fond de la barre</div>
                  <input type="color" value={bgColor || '#ffffff'} onChange={(e) => setBgColor(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
                </div>

              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Éléments visibles</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {(['realisation','evenement','corporate','portrait','animation','galleries','contact','admin'] as (keyof MenuVisible)[]).map((k) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!menuVisible?.[k]} onChange={() => toggleKey(k)} />
                <span style={{ textTransform: 'capitalize' }}>{k}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button onClick={saveAll} className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>

        {error ? <div style={{ marginTop: 8, color: 'red' }}>{error}</div> : null}
        {success ? <div style={{ marginTop: 8, color: 'green' }}>{success}</div> : null}
      </div>
    </div>
  );
}
