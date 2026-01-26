"use client";
import React, { useEffect, useState } from 'react';
import styles from './HeaderSettings.module.css';

type SettingsSite = {
  height?: { value: number; unit?: string };
  width?: { value: number; unit?: string };
  overlay?: { color?: string; opacity?: number };
};

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

export default function HeaderSettings({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  const [page, setPage] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<SettingsSite>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = document.querySelector('[data-measure="hero"]')?.getAttribute('data-page') || undefined;
    setPage(p);
    if (!p) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`/api/admin/hero?slug=${encodeURIComponent(p)}&raw=1`);
        if (!resp.ok) return;
        const j = await resp.json();
        const row = j?.data || {};
        if (!mounted) return;
        setSettings(row.settings_site || {});
      } catch (e) {}
    })();
    return ()=>{ mounted=false };
  }, [open]);

  async function save() {
    if (!page) return;
    setLoading(true);
    const s: SettingsSite = {
      height: { value: clamp(Number(settings?.height?.value || 50), 10, 200), unit: settings?.height?.unit || '%' },
      width: { value: clamp(Number(settings?.width?.value || 100), 10, 200), unit: settings?.width?.unit || '%' },
      overlay: { color: settings?.overlay?.color || '#000000', opacity: clamp(Number(settings?.overlay?.opacity ?? 0.3), 0, 1) },
    };

    try {
      await fetch('/api/admin/hero', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page, settings_site: s }) });
      window.dispatchEvent(new CustomEvent('header-updated', { detail: { page, settings_site: s } }));
      onClose();
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <h3>Modifier Header</h3>
        <div className={styles.row}>
          <div className={styles.label}>Hauteur (%)</div>
          <input className={styles.input} type="number" value={settings?.height?.value ?? 50} onChange={e=>setSettings(prev=>({ ...prev, height: { ...(prev.height||{}), value: Number(e.target.value) } }))} />
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Largeur (%)</div>
          <input className={styles.input} type="number" value={settings?.width?.value ?? 100} onChange={e=>setSettings(prev=>({ ...prev, width: { ...(prev.width||{}), value: Number(e.target.value) } }))} />
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Overlay</div>
          <input className={styles.color} type="color" value={settings?.overlay?.color || '#000000'} onChange={e=>setSettings(prev=>({ ...prev, overlay: { ...(prev.overlay||{}), color: e.target.value } }))} />
          <input className={styles.input} type="range" min="0" max="1" step="0.01" value={settings?.overlay?.opacity ?? 0.3} onChange={e=>setSettings(prev=>({ ...prev, overlay: { ...(prev.overlay||{}), opacity: Number(e.target.value) } }))} />
        </div>

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.secondary}`} onClick={onClose}>Annuler</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={save} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}

