"use no memo";
"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import type { TitleStyleKey } from '../HomeBlocks/homeDefaults';
import ModalTabs from '../ui/ModalTabs';
import { TITLE_FONT_SIZE_MIN, TITLE_FONT_SIZE_MAX } from '../HomeBlocks/homeDefaults';

const TITLE_STYLE_OPTIONS: { value: TitleStyleKey; label: string }[] = [
  { value: 'p', label: 'Paragraphe' },
  { value: 'h1', label: 'Titre 1' },
  { value: 'h2', label: 'Titre 2' },
  { value: 'h3', label: 'Titre 3' },
  { value: 'h4', label: 'Titre 4' },
  { value: 'h5', label: 'Titre 5' },
];

function FontSizeInput({ value, onChange }: { value: number | ''; onChange: (v: number | '') => void }) {
  const [raw, setRaw] = React.useState(value === '' ? '' : String(value));
  React.useEffect(() => { setRaw(value === '' ? '' : String(value)); }, [value]);
  return (
    <input
      type="number"
      min={TITLE_FONT_SIZE_MIN}
      max={TITLE_FONT_SIZE_MAX}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => {
        const n = e.target.value === '' ? '' : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value) || TITLE_FONT_SIZE_MIN));
        onChange(n as number | '');
        setRaw(n === '' ? '' : String(n));
      }}
      placeholder="px"
      style={{ width: 64, padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13 }}
      title={`Taille (${TITLE_FONT_SIZE_MIN}–${TITLE_FONT_SIZE_MAX} px)`}
    />
  );
}

function AlignmentButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [
    { v: 'left', label: '⬅' },
    { v: 'center', label: '≡' },
    { v: 'right', label: '⮕' },
  ];
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          style={{ padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: value === o.v ? '#111' : '#fff', color: value === o.v ? '#fff' : '#111' }}
        >{o.label}</button>
      ))}
    </div>
  );
}

export default function ClientsEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [title, setTitle] = useState('');
  const [titleStyle, setTitleStyle] = useState<TitleStyleKey>('h2');
  const [titleFontSize, setTitleFontSize] = useState<number | ''>('');
  const [titleColor, setTitleColor] = useState('');
  const [titleAlign, setTitleAlign] = useState('left');
  const [logos, setLogos] = useState<Array<{ url: string; path?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [bgColor, setBgColor] = useState('');
  const [logoFilter, setLogoFilter] = useState<string>('');
  const [radiusTop, setRadiusTop] = useState<number | ''>('');
  const [radiusBottom, setRadiusBottom] = useState<number | ''>('');
  const [paddingTop, setPaddingTop] = useState<number | ''>('');
  const [paddingBottom, setPaddingBottom] = useState<number | ''>('');
  const [tab, setTab] = useState<'logos' | 'titre' | 'disposition' | 'style'>('titre');

  const [grid, setGrid] = useState<{ columns: number; itemWidth: number; rowGap: number; colGap: number; heightRatio: number; cloudMode?: boolean; rows?: number; loopMode?: boolean; loopSpeed?: number }>(() => ({
    columns: 5,
    itemWidth: 120,
    rowGap: 12,
    colGap: 8,
    heightRatio: 0.5,
    cloudMode: true,
    rows: 3,
    loopMode: false,
    loopSpeed: 20,
  }));

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=clients_title,clients_title_style,clients_title_font_size,clients_title_color,clients_title_align,clients_logos,clients_grid,clients_bg,clients_logo_filter,clients_radius_top,clients_radius_bottom,clients_padding_top,clients_padding_bottom');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.clients_title) setTitle(String(s.clients_title)); else try { const v = localStorage.getItem('clients_title'); if (v) setTitle(v); } catch(_){}
        if (s.clients_title_style && ['p','h1','h2','h3','h4','h5'].includes(s.clients_title_style)) setTitleStyle(s.clients_title_style as TitleStyleKey);
        if (s.clients_title_font_size != null && s.clients_title_font_size !== '') setTitleFontSize(Number(s.clients_title_font_size));
        if (s.clients_title_color) setTitleColor(String(s.clients_title_color));
        if (s.clients_title_align && ['left','center','right'].includes(s.clients_title_align)) setTitleAlign(String(s.clients_title_align));
        if (s.clients_bg) setBgColor(String(s.clients_bg));
        if (s.clients_logo_filter != null) setLogoFilter(String(s.clients_logo_filter));
        if (s.clients_radius_top != null && s.clients_radius_top !== '') setRadiusTop(Number(s.clients_radius_top));
        if (s.clients_radius_bottom != null && s.clients_radius_bottom !== '') setRadiusBottom(Number(s.clients_radius_bottom));
        if (s.clients_padding_top != null && s.clients_padding_top !== '') setPaddingTop(Number(s.clients_padding_top));
        if (s.clients_padding_bottom != null && s.clients_padding_bottom !== '') setPaddingBottom(Number(s.clients_padding_bottom));
        if (s.clients_logos) {
          try {
            const parsed = JSON.parse(String(s.clients_logos));
            if (Array.isArray(parsed) && parsed.length) {
              const objs = parsed.map((it: any) => (typeof it === 'string' ? { url: String(it) } : { url: String(it?.url || ''), path: String(it?.path || '') }));
              setLogos(objs.filter(o => o.url));
            }
          } catch (_) {
            const arr = String(s.clients_logos || '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
            if (arr.length) setLogos(arr.map(u => ({ url: u })));
          }
        } else {
          try { const v = localStorage.getItem('clients_logos'); if (v) setLogos(JSON.parse(v)); } catch(_){}
        }
        if (s.clients_grid) {
          try {
            const parsed = JSON.parse(String(s.clients_grid));
            if (parsed && typeof parsed === 'object') {
              setGrid(prev => ({
                columns: Number(parsed.columns) || prev.columns,
                itemWidth: Number(parsed.itemWidth) || prev.itemWidth,
                rowGap: Number(parsed.rowGap) || prev.rowGap,
                colGap: Number(parsed.colGap) || prev.colGap,
                heightRatio: typeof parsed.heightRatio !== 'undefined' ? Number(parsed.heightRatio) : prev.heightRatio,
                cloudMode: typeof parsed.cloudMode === 'boolean' ? parsed.cloudMode : (typeof prev.cloudMode === 'boolean' ? prev.cloudMode : true),
                rows: parsed.rows != null ? (Number(parsed.rows) || prev.rows || 3) : (prev.rows ?? 3),
                loopMode: typeof parsed.loopMode === 'boolean' ? parsed.loopMode : (prev.loopMode ?? false),
                loopSpeed: parsed.loopSpeed != null ? (Number(parsed.loopSpeed) || prev.loopSpeed || 20) : (prev.loopSpeed ?? 20),
              }));
            }
          } catch (_) {}
        } else {
          try { const v = localStorage.getItem('clients_grid'); if (v) setGrid(JSON.parse(v)); } catch(_){ }
        }
      } catch (_) {}
    }
    load();
    function onUpdate() { load(); }
    window.addEventListener('site-settings-updated', onUpdate as EventListener);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', onUpdate as EventListener); };
  }, []);

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'clients');
      const resp = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Erreur d\u2019upload');
      const j = await resp.json();
      if (j?.webp) {
        setLogos(prev => [...prev, { url: String(j.webp), path: String(j.path || '') }]);
      } else {
        throw new Error('Upload: pas d\u2019URL retourn\u00e9e');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur');
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function removeAt(idx: number) {
    const item = logos[idx];
    setError(null);
    if (!item) return;
    if (item.path) {
      setDeletingIndex(idx);
      try {
        const resp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: item.path }) });
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setError(j?.error || `Erreur suppression fichier (${resp.status})`);
          setDeletingIndex(null);
          return;
        }
      } catch (err: any) {
        setError(err?.message || 'Erreur suppression');
        setDeletingIndex(null);
        return;
      }
      setDeletingIndex(null);
    }
    setLogos(prev => { const copy = prev.slice(); if (idx >= 0 && idx < copy.length) copy.splice(idx, 1); return copy; });
  }

  function move(from: number, to: number) {
    setLogos(prev => {
      const copy = prev.slice(); if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy; const [it] = copy.splice(from, 1); copy.splice(to, 0, it); return copy;
    });
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const tasks = [
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_title', value: title }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_title_style', value: titleStyle }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_title_font_size', value: titleFontSize !== '' ? String(titleFontSize) : '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_title_color', value: titleColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_title_align', value: titleAlign }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_logos', value: JSON.stringify(logos) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_grid', value: JSON.stringify(grid) }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_bg', value: bgColor }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_logo_filter', value: logoFilter }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_radius_top', value: radiusTop !== '' ? String(radiusTop) : '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_radius_bottom', value: radiusBottom !== '' ? String(radiusBottom) : '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_padding_top', value: paddingTop !== '' ? String(paddingTop) : '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_padding_bottom', value: paddingBottom !== '' ? String(paddingBottom) : '' }) }),
      ];
      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }
      try { localStorage.setItem('clients_title', String(title || '')); } catch(_){}
      try { localStorage.setItem('clients_logos', JSON.stringify(logos)); } catch(_){}
      try { localStorage.setItem('clients_grid', JSON.stringify(grid)); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'clients_logos', value: JSON.stringify(logos) } })); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'clients_grid', value: JSON.stringify(grid) } })); } catch(_){ }
      setSuccess('Sauvegardé');
      if (onSaved) onSaved();
      setTimeout(() => onClose(), 400);
    } catch (err: any) { setError(err?.message || 'Erreur'); } finally { setSaving(false); }
  }

  const inputStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13 };

  const modalContent = (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50000, padding: '70px 16px 16px', overflowY: 'auto' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', color: '#000', padding: 20, width: 820, maxWidth: '98%', borderRadius: 10, alignSelf: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Modifier le bloc Clients</h3>
          <button onClick={() => onClose()} aria-label="Fermer" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <ModalTabs
          tabs={[
            { id: 'titre', label: 'Titre' },
            { id: 'logos', label: 'Logos' },
            { id: 'disposition', label: 'Disposition' },
            { id: 'style', label: 'Style' },
          ]}
          active={tab}
          onChange={(t) => setTab(t as any)}
        />

        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {tab === 'logos' && (<>
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Logos</label>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="file" accept="image/*" multiple onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const f of files) {
                  await handleFileSelect(f);
                }
              }} />
              {uploading ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>Téléchargement…</span> : null}
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 8 }}>
              {logos.length === 0 ? <div style={{ color: '#666' }}>Aucun logo pour l'instant</div> : logos.map((u, i) => (
                <div key={`${u.url || u}-${i}`} style={{ padding: 8, borderRadius: 8, background: '#fafafa', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><img src={String((u as any).url || u)} alt={`logo-${i}`} style={{ width: '100%', height: 60, objectFit: 'contain', borderRadius: 6 }} /></div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-secondary" onClick={() => { if (i > 0) move(i, i - 1); }} disabled={i === 0} style={{ padding: '3px 4px', fontSize: 10, minWidth: 18, height: 18 }}>▲</button>
                      <button className="btn-secondary" onClick={() => { if (i < logos.length - 1) move(i, i + 1); }} disabled={i === logos.length - 1} style={{ padding: '3px 4px', fontSize: 10, minWidth: 18, height: 18 }}>▼</button>
                    </div>
                    <div>
                      <button className="btn-secondary" onClick={() => removeAt(i)} style={{ padding: '3px 4px', fontSize: 10, minWidth: 28, height: 18 }}>{deletingIndex === i ? 'Suppression...' : 'Suppr'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>)}

          {tab === 'titre' && (<>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Titre</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                placeholder="CLIENTS ET PARTENAIRES PROFESSIONNELS"
              />
              <select value={titleStyle} onChange={(e) => setTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                {TITLE_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <FontSizeInput value={titleFontSize} onChange={setTitleFontSize} />
              <input
                type="color"
                value={titleColor || '#1a1a18'}
                onChange={(e) => setTitleColor(e.target.value)}
                style={{ width: 40, height: 32, padding: 0, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer' }}
                title="Couleur du titre"
              />
              {titleColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setTitleColor('')}>↺</button> : null}
              <AlignmentButtons value={titleAlign} onChange={setTitleAlign} />
            </div>
          </div>
          </>)}

          {tab === 'disposition' && (<>
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Disposition (desktop)</label>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Colonnes</label>
                <input type="number" min={1} max={8} value={grid.columns} onChange={(e) => setGrid(g => ({ ...g, columns: Math.max(1, Number(e.target.value || 1)) }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Largeur image (px)</label>
                <input type="number" min={60} max={300} value={grid.itemWidth} onChange={(e) => setGrid(g => ({ ...g, itemWidth: Math.max(60, Number(e.target.value || 60)) }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Espace lignes (px)</label>
                <input type="number" min={0} max={64} value={grid.rowGap} onChange={(e) => setGrid(g => ({ ...g, rowGap: Math.max(0, Number(e.target.value || 0)) }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Espace colonnes (px)</label>
                <input type="number" min={0} max={64} value={grid.colGap} onChange={(e) => setGrid(g => ({ ...g, colGap: Math.max(0, Number(e.target.value || 0)) }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Hauteur relative (ratio)</label>
                <input type="number" min={0.2} max={1} step={0.05} value={grid.heightRatio} onChange={(e) => setGrid(g => ({ ...g, heightRatio: Math.max(0.2, Math.min(1, Number(e.target.value || 0.5))) }))} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)' }}>Mode d'affichage</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: 'normal', label: 'Normal' },
                  { value: 'nuage', label: 'Nuage' },
                  { value: 'loop', label: 'Boucle infinie' },
                ] as const).map(opt => {
                  const active = opt.value === 'loop' ? !!grid.loopMode : opt.value === 'nuage' ? (!grid.loopMode && !!grid.cloudMode) : (!grid.loopMode && !grid.cloudMode);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGrid(g => ({
                        ...g,
                        cloudMode: opt.value === 'nuage',
                        loopMode: opt.value === 'loop',
                      }))}
                      style={{ padding: '6px 14px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: active ? '#111' : '#fff', color: active ? '#fff' : '#111' }}
                    >{opt.label}</button>
                  );
                })}
              </div>

              {!grid.loopMode && !!grid.cloudMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Nombre de lignes (desktop)</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={grid.rows ?? 3}
                    onChange={(e) => {
                      const n = Number(e.target.value || 3);
                      setGrid(g => ({ ...g, rows: Math.max(1, Math.min(6, n || 3)) }));
                    }}
                    style={{ width: 70 }}
                  />
                </div>
              )}

              {!!grid.loopMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Vitesse (secondes par cycle, plus bas = plus rapide)</span>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={grid.loopSpeed ?? 20}
                    onChange={(e) => setGrid(g => ({ ...g, loopSpeed: Math.max(5, Math.min(60, Number(e.target.value || 20))) }))}
                    style={{ width: 70 }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)' }}>Aperçu</label>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, grid.columns)}, minmax(0, 1fr))`, gap: `${grid.rowGap}px ${grid.colGap}px`, justifyContent: 'center', alignItems: 'center' }}>
                {(logos.length ? logos : [{ url: '' }, { url: '' }, { url: '' }, { url: '' }, { url: '' }, { url: '' }]).slice(0, 6).map((u, i) => (
                  <div key={`preview-${i}`} style={{ width: grid.itemWidth, aspectRatio: String(1 / Math.max(0.2, grid.heightRatio)), display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 6 }}>
                    {u.url ? <img src={u.url} alt={`preview-${i}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ width: '80%', height: '60%', background: '#f3f4f6' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>)}

          {tab === 'style' && (<>
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Couleur de fond (optionnel)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={bgColor || '#fafaf9'} onChange={(e) => setBgColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: '1px solid #e6e6e6', borderRadius: 6 }} />
              <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="ou hex (ex. #fafaf9)" style={{ padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, width: 140 }} />
              {bgColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setBgColor('')}>Effacer</button> : null}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Style des logos</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setLogoFilter(logoFilter === 'white' ? '' : 'white')}
                style={{ padding: '6px 14px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: logoFilter === 'white' ? '#111' : '#fff', color: logoFilter === 'white' ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: logoFilter === 'white' ? '#fff' : '#ccc', border: '1px solid #999' }} />
                Logos blancs (fond sombre)
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {logoFilter === 'white' ? 'Filtre actif : logos convertis en blanc' : 'Couleur originale des logos'}
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Arrondis de la section</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>Haut (px)</label>
                <input type="number" min={0} max={120} value={radiusTop === '' ? '' : radiusTop} onChange={(e) => setRadiusTop(e.target.value === '' ? '' : Math.max(0, Math.min(120, Number(e.target.value))))} placeholder="défaut CSS" style={{ padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, width: 96 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>Bas (px)</label>
                <input type="number" min={0} max={120} value={radiusBottom === '' ? '' : radiusBottom} onChange={(e) => setRadiusBottom(e.target.value === '' ? '' : Math.max(0, Math.min(120, Number(e.target.value))))} placeholder="défaut CSS" style={{ padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, width: 96 }} />
              </div>
              {(radiusTop !== '' || radiusBottom !== '') ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => { setRadiusTop(''); setRadiusBottom(''); }}>↺ Réinitialiser</button> : null}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Espacement interne vertical (px)</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>Haut (px)</label>
                <input type="number" min={0} max={300} value={paddingTop === '' ? '' : paddingTop} onChange={(e) => setPaddingTop(e.target.value === '' ? '' : Math.max(0, Math.min(300, Number(e.target.value))))} placeholder="défaut CSS" style={{ padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, width: 96 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)' }}>Bas (px)</label>
                <input type="number" min={0} max={300} value={paddingBottom === '' ? '' : paddingBottom} onChange={(e) => setPaddingBottom(e.target.value === '' ? '' : Math.max(0, Math.min(300, Number(e.target.value))))} placeholder="défaut CSS" style={{ padding: '6px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13, width: 96 }} />
              </div>
              {(paddingTop !== '' || paddingBottom !== '') ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => { setPaddingTop(''); setPaddingBottom(''); }}>↺ Réinitialiser</button> : null}
            </div>
          </div>
          </>)}

          {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
          {success ? <div style={{ color: 'green' }}>{success}</div> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button className="btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(modalContent, document.body);
}
