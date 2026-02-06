"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

export default function ClientsEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [title, setTitle] = useState('');
  const [logos, setLogos] = useState<Array<{ url: string; path?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [grid, setGrid] = useState<{ columns: number; itemWidth: number; rowGap: number; colGap: number; heightRatio: number; cloudMode?: boolean; rows?: number }>(() => ({
    columns: 5,
    itemWidth: 120,
    rowGap: 12,
    colGap: 8,
    heightRatio: 0.5,
    cloudMode: true,
    rows: 3,
  }));

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=clients_title,clients_logos,clients_grid');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.clients_title) setTitle(String(s.clients_title)); else try { const v = localStorage.getItem('clients_title'); if (v) setTitle(v); } catch(_){}
        if (s.clients_logos) {
          try {
            const parsed = JSON.parse(String(s.clients_logos));
            if (Array.isArray(parsed) && parsed.length) {
              const objs = parsed.map((it: any) => (typeof it === 'string' ? { url: String(it) } : { url: String(it?.url || ''), path: String(it?.path || '') }));
              setLogos(objs.filter(o => o.url));
            }
          } catch (_) {
            // fallback parsing newline list
            const arr = String(s.clients_logos || '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
            if (arr.length) setLogos(arr.map(u => ({ url: u })));
          }
        } else {
          try { const v = localStorage.getItem('clients_logos'); if (v) setLogos(JSON.parse(v)); } catch(_){}
        }
        // load grid settings if present
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
              }));
            }
          } catch (_) {}
        } else {
          try { const v = localStorage.getItem('clients_grid'); if (v) setGrid(JSON.parse(v)); } catch(_){ }
        }      } catch (_) {}
    }
    load();
    function onUpdate(e?: any) { load(); }
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
      // category 'clients' to store under clients/<timestamp>.webp
      fd.append('category', 'clients');
      const resp = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Erreur d\u2019upload');
      const j = await resp.json();
      if (j?.webp) {
        // store url and storage path so we can delete later
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
    // if we have a storage path, attempt to delete it and check the response
    if (item.path) {
      setDeletingIndex(idx);
      try {
        const resp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: item.path }) });
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          // do not remove from UI if server failed to delete; surface the error
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

    // remove from local list regardless (if no storage path we assume remote URL)
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
        // persist logos as array of objects {url,path}
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_logos', value: JSON.stringify(logos) }) }),
        // persist grid settings
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'clients_grid', value: JSON.stringify(grid) }) }),
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', color: '#000', padding: 20, width: 820, maxWidth: '98%', maxHeight: '86vh', overflowY: 'auto', borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Modifier le bloc Clients</h3>
          <button onClick={() => onClose()} aria-label="Fermer" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)' }}>Titre</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ minHeight: 44, border: '1px solid #e6e6e6', borderRadius: 6, padding: 10, background: '#fff' }} dangerouslySetInnerHTML={{ __html: (title || '<p style="color:#999">Aucun</p>') }} />
            </div>
            <div>
              <button className="btn-ghost" onClick={() => setEditingTitle(true)}>Éditer</button>
            </div>
          </div>

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

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                <input
                  type="checkbox"
                  checked={!!grid.cloudMode}
                  onChange={(e) => setGrid(g => ({ ...g, cloudMode: e.target.checked }))}
                />
                <span>Activer le mode « nuage » en desktop (lignes équilibrées, comme en mobile)</span>
              </label>

              {grid.cloudMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
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

          {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
          {success ? <div style={{ color: 'green' }}>{success}</div> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button className="btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>

        {editingTitle ? (
          <React.Suspense fallback={null}>
            <RichTextModal title="Éditer le titre Clients" initial={title} onClose={() => setEditingTitle(false)} onSave={async (html) => { setTitle(html); setEditingTitle(false); }} />
          </React.Suspense>
        ) : null}

      </div>
    </div>
  );
}
