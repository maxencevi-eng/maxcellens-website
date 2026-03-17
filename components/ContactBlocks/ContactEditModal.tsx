"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
import ModalTabs from '../ui/ModalTabs';

const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

const parseNumber = (v: any, def: number) => { const n = Number(v); return isNaN(n) ? def : n; };

export interface AboutRow {
  label: string;
  content: string;
  contentHtml?: string;
  labelFontSize?: number;
  labelColor?: string;
  labelFontFamily?: string;
}

export interface LabelStyle {
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

const DEFAULT_ROWS: AboutRow[] = [
  { label: 'SERVICES', content: "J'accompagne les entreprises et commerces dans leur communication visuelle. Mon expertise se concentre en priorité sur la réalisation de vidéos commerciales impactantes et la couverture d'événements (vidéo & photo)." },
  { label: 'PROJETS', content: "Je réalise également vos films institutionnels, vos portraits professionnels ainsi que des ateliers Team Building Série TV. Partenaire des sociétés de production, j'interviens aussi régulièrement en tant que cadreur pour renforcer vos équipes techniques sur le terrain." },
  { label: 'SECTEURS', content: "Basé en Île-de-France, je me déplace dans toute la France pour des missions sur mesure. Discutons de votre projet et de vos attentes." },
  { label: 'PARCOURS', content: "(2015 – 2020) Chef de projets Information (AMOA)\n(Depuis 2020) Vidéaste & Photographe Indépendant" },
  { label: 'CONTACT', content: "EMAIL  maxcellens@gmail.com\nTÉLÉPHONE  (+33) 06 74 96 64 58" },
];

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', marginTop: 4, borderRadius: 6, border: '1px solid #e6e6e6', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#888', display: 'block', marginBottom: 3 };

export default function ContactEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [contactHandle, setContactHandle] = useState('@maxcellens');
  const [rows, setRows] = useState<AboutRow[]>(DEFAULT_ROWS);
  const [introBackgroundColor, setIntroBackgroundColor] = useState('');
  const [photo, setPhoto] = useState<{ url?: string; path?: string } | null>(null);
  const [originalPhotoPath, setOriginalPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'titre' | 'lignes' | 'photo' | 'style'>('titre');
  const [editingRichTextIndex, setEditingRichTextIndex] = useState<number | null>(null);

  // Handle style
  const [handleColor, setHandleColor] = useState('#2d6b5f');
  const [handleFontSize, setHandleFontSize] = useState(18);
  const [handleFontWeight, setHandleFontWeight] = useState(700);
  const [handleFontFamily, setHandleFontFamily] = useState('');

  // Global label style
  const [labelFontSize, setLabelFontSize] = useState(10);
  const [labelColor, setLabelColor] = useState('');
  const [labelFontFamily, setLabelFontFamily] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_handle,contact_intro,contact_photo,contact_handle_color,contact_handle_font_size,contact_handle_font_weight,contact_handle_font_family');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_handle != null) setContactHandle(String(s.contact_handle));
        else setContactHandle('@maxcellens');
        if (s.contact_intro) {
          try {
            const parsed = JSON.parse(String(s.contact_intro));
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.rows) && parsed.rows.length > 0) setRows(parsed.rows);
              setIntroBackgroundColor(parsed.backgroundColor ?? '');
              if (parsed.labelStyle) {
                if (parsed.labelStyle.fontSize) setLabelFontSize(parsed.labelStyle.fontSize);
                if (parsed.labelStyle.color) setLabelColor(parsed.labelStyle.color);
                if (parsed.labelStyle.fontFamily != null) setLabelFontFamily(parsed.labelStyle.fontFamily);
              }
            }
          } catch (_) {}
        }
        if (s.contact_photo) {
          try {
            const parsed = JSON.parse(String(s.contact_photo));
            if (parsed && (parsed.url || parsed.path)) { setPhoto({ url: parsed.url, path: parsed.path }); setOriginalPhotoPath(parsed.path || null); }
            else if (typeof parsed === 'string') { setPhoto({ url: parsed }); setOriginalPhotoPath(null); }
          } catch (e) { setPhoto({ url: String(s.contact_photo) }); setOriginalPhotoPath(null); }
        }
        if (s.contact_handle_color) setHandleColor(String(s.contact_handle_color));
        if (s.contact_handle_font_size) setHandleFontSize(parseNumber(s.contact_handle_font_size, 18));
        if (s.contact_handle_font_weight) setHandleFontWeight(parseNumber(s.contact_handle_font_weight, 700));
        if (s.contact_handle_font_family != null) setHandleFontFamily(String(s.contact_handle_font_family));
      } catch (_) {}
    }
    load();
    window.addEventListener('site-settings-updated', load as EventListener);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', load as EventListener); };
  }, []);

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'contact');
      const currentPath = photo?.path || originalPhotoPath;
      if (currentPath) fd.append('old_path', currentPath);
      const resp = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Erreur d\u2019upload');
      const j = await resp.json();
      if (j?.webp) {
        setPhoto({ url: String(j.webp), path: String(j.path || '') });
        setOriginalPhotoPath(j.path ? String(j.path) : null);
      } else throw new Error('Upload: pas d\u2019URL retourn\u00e9e');
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    if (!photo?.path) { setPhoto(null); setOriginalPhotoPath(null); return; }
    setError(null);
    try {
      const resp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: photo.path }) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || `Erreur suppression (${resp.status})`);
      setPhoto(null); setOriginalPhotoPath(null);
    } catch (err: any) { setError(err?.message || 'Erreur suppression'); }
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      const ls: LabelStyle = { fontSize: labelFontSize, color: labelColor || undefined, fontFamily: labelFontFamily || undefined };
      const tasks: Promise<Response>[] = [];
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_handle', value: String(contactHandle || '@maxcellens') }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_intro', value: JSON.stringify({ rows, labelStyle: ls, backgroundColor: introBackgroundColor?.trim() || undefined }) }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_photo', value: JSON.stringify(photo || '') }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_handle_color', value: handleColor }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_handle_font_size', value: String(handleFontSize) }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_handle_font_weight', value: String(handleFontWeight) }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_handle_font_family', value: handleFontFamily }) }));
      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j?.error || 'Erreur sauvegarde'); }
      }
      setOriginalPhotoPath(photo?.path || null);
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'contact_intro' } })); } catch (_) {}
      onSaved?.();
      setTimeout(() => onClose(), 300);
    } catch (err: any) { setError(err?.message || 'Erreur'); } finally { setSaving(false); }
  }

  function getRichTextInitial(row: AboutRow): string {
    if (row.contentHtml) return row.contentHtml;
    // Convert plain text to basic HTML
    return row.content.split('\n').filter(Boolean).map(l => `<p>${l}</p>`).join('') || '<p></p>';
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="modal-overlay-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50000, padding: '70px 16px 16px', overflowY: 'auto' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: '#fff', color: '#000', padding: 20, width: 860, maxWidth: '98%', borderRadius: 10, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Modifier le bloc Contact</h3>
            <button onClick={onClose} aria-label="Fermer" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          <ModalTabs
            tabs={[
              { id: 'titre', label: 'Titre' },
              { id: 'lignes', label: 'Lignes' },
              { id: 'photo', label: 'Photo' },
              { id: 'style', label: 'Style' },
            ]}
            active={tab}
            onChange={(t) => setTab(t as any)}
          />

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── TITRE ── */}
            {tab === 'titre' && (<>
              <div>
                <label style={{ fontSize: 13, color: '#666' }}>Texte en-tête</label>
                <input type="text" value={contactHandle} onChange={(e) => setContactHandle(e.target.value)} placeholder="@maxcellens" style={inputStyle} />
              </div>
              <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Aperçu</div>
                <div style={{ fontFamily: handleFontFamily || 'inherit', fontSize: handleFontSize, fontWeight: handleFontWeight, color: handleColor }}>
                  {contactHandle || '@maxcellens'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>Couleur</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input type="color" value={handleColor || '#2d6b5f'} onChange={(e) => setHandleColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: '1px solid #e6e6e6', borderRadius: 6 }} />
                    <input type="text" value={handleColor} onChange={(e) => setHandleColor(e.target.value)} placeholder="#2d6b5f" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #e6e6e6', fontSize: 13 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>Police</div>
                  <select value={handleFontFamily} onChange={(e) => setHandleFontFamily(e.target.value)} style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid #e6e6e6', fontSize: 13 }}>
                    <option value="">Inter (défaut)</option>
                    <option value="Playfair Display, serif">Playfair Display</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>Taille — {handleFontSize}px</div>
                  <input type="range" min={12} max={72} value={handleFontSize} onChange={(e) => setHandleFontSize(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>Épaisseur</div>
                  <select value={handleFontWeight} onChange={(e) => setHandleFontWeight(Number(e.target.value))} style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid #e6e6e6', fontSize: 13 }}>
                    <option value={400}>400 — Normal</option>
                    <option value={500}>500 — Medium</option>
                    <option value={600}>600 — Semi-bold</option>
                    <option value={700}>700 — Bold</option>
                    <option value={800}>800 — Extra-bold</option>
                  </select>
                </div>
              </div>
            </>)}

            {/* ── LIGNES ── */}
            {tab === 'lignes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Label style global */}
                <div style={{ background: '#f8f8f8', borderRadius: 8, padding: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <strong style={{ fontSize: 12, color: '#555', width: '100%' }}>Style des labels (SERVICES, PROJETS…)</strong>
                  <div>
                    <label style={labelStyle}>Taille (px)</label>
                    <input type="number" min={8} max={24} value={labelFontSize} onChange={e => setLabelFontSize(Number(e.target.value))}
                      style={{ width: 64, padding: '6px 8px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Couleur</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={labelColor || '#aaaaaa'} onChange={e => setLabelColor(e.target.value)}
                        style={{ width: 38, height: 32, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                      {labelColor && <button onClick={() => setLabelColor('')} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>↺</button>}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={labelStyle}>Police</label>
                    <select value={labelFontFamily} onChange={e => setLabelFontFamily(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 13 }}>
                      <option value="">Défaut</option>
                      <option value="Playfair Display, serif">Playfair Display</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Courier New', monospace">Courier New</option>
                    </select>
                  </div>
                </div>

                {/* Rows */}
                {rows.map((row, i) => (
                  <div key={i} style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 12, color: '#555' }}>Ligne {i + 1}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setRows(prev => { const a = [...prev]; if (i > 0) { [a[i-1], a[i]] = [a[i], a[i-1]]; } return a; })} disabled={i === 0}
                          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11 }}>↑</button>
                        <button onClick={() => setRows(prev => { const a = [...prev]; if (i < a.length-1) { [a[i], a[i+1]] = [a[i+1], a[i]]; } return a; })} disabled={i === rows.length - 1}
                          style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11 }}>↓</button>
                        {rows.length > 1 && (
                          <button onClick={() => setRows(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: '1px solid #fcc', color: '#c00', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11 }}>✕</button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'start' }}>
                      <div>
                        <label style={labelStyle}>Label</label>
                        <input value={row.label} onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                          style={{ ...inputStyle, fontSize: 12, marginTop: 0, fontFamily: labelFontFamily || 'inherit', fontSize: 11 as any, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                          placeholder="SERVICES" />
                      </div>
                      <div>
                        <label style={labelStyle}>Contenu (richtext)</label>
                        <div
                          onClick={() => setEditingRichTextIndex(i)}
                          style={{ minHeight: 60, border: '1px solid #e6e6e6', borderRadius: 6, padding: '8px 10px', background: '#fafafa', cursor: 'text', fontSize: 13, lineHeight: 1.55 }}
                          dangerouslySetInnerHTML={{ __html: row.contentHtml || (row.content ? row.content.split('\n').filter(Boolean).map(l => `<p style="margin:0 0 4px">${l}</p>`).join('') : '<em style="color:#bbb">Cliquez pour éditer…</em>') }}
                        />
                        <button onClick={() => setEditingRichTextIndex(i)}
                          style={{ marginTop: 5, padding: '4px 12px', fontSize: 12, borderRadius: 5, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                          ✏️ Éditer en richtext
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={() => setRows(prev => [...prev, { label: '', content: '', contentHtml: '' }])}
                  style={{ padding: 10, borderRadius: 8, border: '1px dashed #ccc', background: '#fafafa', cursor: 'pointer', fontSize: 13 }}>
                  + Ajouter une ligne
                </button>
              </div>
            )}

            {/* ── PHOTO ── */}
            {tab === 'photo' && (<>
              <label style={{ fontSize: 13, color: '#666' }}>Photo</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="file" accept="image/*" onChange={async (e) => { const f = (e.target.files && e.target.files[0]) || null; if (f) await handleFileSelect(f); }} />
                {uploading && <span style={{ fontSize: 13, color: '#999' }}>Téléchargement…</span>}
                {photo?.url && <img src={String(photo.url)} alt="preview" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />}
                {photo?.url && <button className="btn-secondary" onClick={removePhoto}>Supprimer</button>}
              </div>
            </>)}

            {/* ── STYLE ── */}
            {tab === 'style' && (<>
              <div>
                <label style={{ fontSize: 13, color: '#666' }}>Couleur de fond</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <input type="color" value={introBackgroundColor || '#fafaf9'} onChange={(e) => setIntroBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: '1px solid #e6e6e6', borderRadius: 6 }} />
                  <input type="text" value={introBackgroundColor} onChange={(e) => setIntroBackgroundColor(e.target.value)} placeholder="hex ou transparent" style={{ width: 160, padding: '8px 12px', borderRadius: 6, border: '1px solid #e6e6e6', boxSizing: 'border-box' }} />
                  {introBackgroundColor && <button type="button" style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setIntroBackgroundColor('')}>Effacer</button>}
                </div>
              </div>
            </>)}

            {error && <div style={{ color: 'crimson', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
              <button className="btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* RichText editor per row */}
      {editingRichTextIndex !== null && (
        <RichTextModal
          title={`Éditer — ${rows[editingRichTextIndex]?.label || `Ligne ${editingRichTextIndex + 1}`}`}
          initial={getRichTextInitial(rows[editingRichTextIndex])}
          onClose={() => setEditingRichTextIndex(null)}
          onSave={(html) => {
            setRows(prev => prev.map((r, j) => j === editingRichTextIndex ? { ...r, contentHtml: html, content: '' } : r));
            setEditingRichTextIndex(null);
          }}
        />
      )}
    </>,
    document.body
  );

  function getRichTextInitial(row: AboutRow): string {
    if (row.contentHtml) return row.contentHtml;
    return row.content.split('\n').filter(Boolean).map(l => `<p>${l}</p>`).join('') || '<p></p>';
  }
}
