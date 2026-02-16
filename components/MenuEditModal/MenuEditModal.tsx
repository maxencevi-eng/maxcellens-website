"use client";
import React, { useEffect, useState } from 'react';

const parseNumber = (v: any, def: number) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

function safeJsonParse<T>(v: string, def: T): T {
  try {
    return JSON.parse(v) as T;
  } catch {
    return def;
  }
};

const getStorage = (key: string) => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const setStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const setCssVar = (key: string, value: string) => {
  try {
    document.documentElement.style.setProperty(key, value);
  } catch {}
};

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

export default function MenuEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [menuVisible, setMenuVisible] = useState<MenuVisible>({ realisation: true, evenement: true, corporate: true, portrait: true, animation: true, galleries: true, contact: true, admin: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fontFamily, setFontFamily] = useState<string>(() => getStorage('navFontFamily') || '');
  const [fontSize, setFontSize] = useState<number>(() => parseNumber(getStorage('navFontSize'), 16));
  const [fontWeight, setFontWeight] = useState<number>(() => parseNumber(getStorage('navFontWeight'), 600));
  const [textColor, setTextColor] = useState<string>(() => getStorage('navTextColor') || '');
  const [hoverColor, setHoverColor] = useState<string>(() => getStorage('navHoverTextColor') || '');
  const [activeColor, setActiveColor] = useState<string>(() => getStorage('navActiveTextColor') || '');
  const [bgColor, setBgColor] = useState<string>(() => getStorage('navBgColor') || '');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=navFontFamily,navFontSize,navFontWeight,navTextColor,navHoverTextColor,navActiveTextColor,navBgColor,navMenuVisible');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;

        if (s.navFontFamily) { setFontFamily(String(s.navFontFamily)); setStorage('navFontFamily', String(s.navFontFamily)); }
        if (s.navFontSize) { const v = parseNumber(s.navFontSize, 16); setFontSize(v); setStorage('navFontSize', String(v)); }
        if (s.navFontWeight) { const w = parseNumber(s.navFontWeight, 600); setFontWeight(w); setStorage('navFontWeight', String(w)); }
        if (s.navTextColor) { setTextColor(String(s.navTextColor)); setStorage('navTextColor', String(s.navTextColor)); }
        if (s.navHoverTextColor) { setHoverColor(String(s.navHoverTextColor)); setStorage('navHoverTextColor', String(s.navHoverTextColor)); }
        if (s.navActiveTextColor) { setActiveColor(String(s.navActiveTextColor)); setStorage('navActiveTextColor', String(s.navActiveTextColor)); }
        if (s.navBgColor) { setBgColor(String(s.navBgColor)); setStorage('navBgColor', String(s.navBgColor)); }
        if (s.navMenuVisible) { setMenuVisible(safeJsonParse(String(s.navMenuVisible), { realisation: true, evenement: true, corporate: true, portrait: true, animation: true, galleries: true, contact: true, admin: true })); }
      } catch (_) {}
    }
    load();
    return () => { mounted = false; };
  }, []);

  function toggleKey(key: keyof MenuVisible) {
    setMenuVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function applyLocalAndCss() {
    setCssVar('--nav-font-family', fontFamily || '');
    setCssVar('--nav-font-size', `${fontSize}px`);
    setCssVar('--nav-font-weight', String(fontWeight));
    setCssVar('--nav-text-color', textColor || '');
    setCssVar('--nav-hover-text-color', hoverColor || '');
    setCssVar('--nav-active-text-color', activeColor || '');
    setCssVar('--nav-bg-color', bgColor || '');
    
    setStorage('navFontFamily', fontFamily || '');
    setStorage('navFontSize', String(fontSize));
    setStorage('navFontWeight', String(fontWeight));
    setStorage('navTextColor', textColor || '');
    setStorage('navHoverTextColor', hoverColor || '');
    setStorage('navActiveTextColor', activeColor || '');
    setStorage('navBgColor', bgColor || '');
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      applyLocalAndCss();
      const tasks = [
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navFontFamily', value: fontFamily }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navFontSize', value: String(fontSize) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navFontWeight', value: String(fontWeight) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navTextColor', value: textColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navHoverTextColor', value: hoverColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navActiveTextColor', value: activeColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navBgColor', value: bgColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'navMenuVisible', value: JSON.stringify(menuVisible) }) })
      ];

      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }

      try { setStorage('navMenuVisible', JSON.stringify(menuVisible)); } catch(_){}
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch(_){}

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
    <div className="modal-overlay-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50000 }}>
      <div style={{ background: '#fff', color: '#000', padding: 20, width: 760, maxWidth: '98%', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto', borderRadius: 8, position: 'relative' }}>
        <h3 style={{ marginTop: 0 }}>Modifier le menu</h3>

        <div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Aperçu</label>
            <div style={{ marginTop: 8, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 100, padding: 8 }}>
              <nav style={{ display: 'flex', gap: 'var(--nav-gap, 0.6rem)', alignItems: 'center', fontFamily: fontFamily || 'inherit', fontSize: `${fontSize}px`, fontWeight: fontWeight as any, background: bgColor || 'transparent', padding: '8px' }}>
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
