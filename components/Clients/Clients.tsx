"use client";

import styles from './Clients.module.css';

type Props = {
  logos?: string[];
  title?: string;
};

function makePlaceholder(text: string, w = 160, h = 60) {
  const bg = '#f3f4f6';
  const fg = '#999999';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect fill='${bg}' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='${fg}' font-size='14' font-family='Arial,Helvetica,sans-serif'>${text}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const defaultLogos = [
  makePlaceholder('Logo 1'),
  makePlaceholder('Logo 2'),
  makePlaceholder('Logo 3'),
  makePlaceholder('Logo 4'),
  makePlaceholder('Logo 5'),
  makePlaceholder('Logo 6'),
  makePlaceholder('Logo 7'),
  makePlaceholder('Logo 8'),
  makePlaceholder('Logo 9'),
  makePlaceholder('Logo 10'),
];

import React, { useEffect, useState } from 'react';
import ClientsEditModal from './ClientsEditModal';
import { supabase } from '../../lib/supabase';

export default function Clients({ logos, title }: Props) {
  const [items, setItems] = useState<string[]>(logos && logos.length ? logos : defaultLogos);
  const [hdr, setHdr] = useState<string | undefined>(title || 'CLIENTS ET PARTENAIRES PROFESSIONNELS');
  const [itemsObjects, setItemsObjects] = useState<Array<{ url: string; path?: string }>>([]);
  const [editing, setEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // grid settings (from site-settings `clients_grid`)
  const [gridSettings, setGridSettings] = useState<{ columns: number; itemWidth: number; rowGap: number; colGap: number; heightRatio: number }>(() => ({ columns: 5, itemWidth: 120, rowGap: 12, colGap: 8, heightRatio: 0.5 }));

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=clients_title,clients_logos,clients_grid');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.clients_title) setHdr(String(s.clients_title));
        if (s.clients_logos) {
          try {
            const parsed = JSON.parse(String(s.clients_logos));
            if (Array.isArray(parsed) && parsed.length) {
              // support both array of strings or array of objects {url,path}
              const objs = parsed.map((it: any) => (typeof it === 'string' ? { url: String(it) } : { url: String(it?.url || ''), path: String(it?.path || '') }));
              const urls = objs.map(o => o.url || '').filter(Boolean);
              if (urls.length) {
                setItems(urls);
                setItemsObjects(objs);
              }
            }
          } catch (_) {
            const arr = String(s.clients_logos || '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
            if (arr.length) setItems(arr.map(u => ({ url: u })));
          }
        }
        // load grid settings
        if (s.clients_grid) {
          try {
            const g = JSON.parse(String(s.clients_grid));
            if (g && typeof g === 'object') {
              setGridSettings(prev => ({
                columns: Number(g.columns) || prev.columns,
                itemWidth: Number(g.itemWidth) || prev.itemWidth,
                rowGap: Number(g.rowGap) || prev.rowGap,
                colGap: Number(g.colGap) || prev.colGap,
                heightRatio: typeof g.heightRatio !== 'undefined' ? Number(g.heightRatio) : prev.heightRatio,
              }));
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    load();
    function onUpdate() { load(); }
    window.addEventListener('site-settings-updated', onUpdate as EventListener);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', onUpdate as EventListener); };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} };
  }, []);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.inner}>
          <div style={{ position: 'relative', display: 'block' }}>
            <h2 className={styles.title} dangerouslySetInnerHTML={{ __html: hdr || '' }} />
            {isAdmin ? <button onClick={() => setEditing(true)} className="btn-secondary" style={{ position: 'absolute', right: 12, top: 8, zIndex: 5, background: '#111', color: '#fff', border: 'none' }}>Modifier</button> : null}
          </div>

          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${Math.max(1, gridSettings.columns)}, ${gridSettings.itemWidth}px)`, gap: `${gridSettings.rowGap}px ${gridSettings.colGap}px`, justifyContent: 'center' }}>
            {(itemsObjects.length ? itemsObjects : items.map(u => ({ url: u }))).map((it, i) => (
              <div key={i} className={styles.item} style={{ width: gridSettings.itemWidth, height: Math.max(36, Math.round(gridSettings.itemWidth / 2)), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={it.url}
                  alt={`client-${i}`}
                  loading="lazy"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    // fallback to an inline SVG data URI to avoid external requests
                    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><rect fill='%23f3f4f6' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'>Logo</text></svg>`;
                    el.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
                    el.onerror = null;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing ? <ClientsEditModal onClose={() => setEditing(false)} onSaved={() => setEditing(false)} /> : null}
    </section>
  );
}
