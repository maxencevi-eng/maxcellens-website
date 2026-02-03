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
  const [settings, setSettings] = useState<SettingsSite>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=header_site_settings');
        if (!resp.ok) return;
        const j = await resp.json();
        const raw = j?.settings?.header_site_settings;
        if (!mounted) return;
        if (raw && typeof raw === 'string') {
          try {
            setSettings(JSON.parse(raw));
          } catch (_) {
            setSettings({});
          }
        } else {
          setSettings({});
        }
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [open]);

  async function save() {
    setLoading(true);
    const s: SettingsSite = {
      height: { value: clamp(Number(settings?.height?.value || 50), 10, 200), unit: settings?.height?.unit || '%' },
      width: { value: clamp(Number(settings?.width?.value || 100), 10, 200), unit: settings?.width?.unit || '%' },
      overlay: { color: settings?.overlay?.color || '#000000', opacity: clamp(Number(settings?.overlay?.opacity ?? 0.3), 0, 1) },
    };

    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'header_site_settings', value: JSON.stringify(s) }),
      });
      window.dispatchEvent(new CustomEvent('header-updated', { detail: { settings_site: s } }));
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
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>Ces réglages s&apos;appliquent à tous les headers du site.</p>
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

