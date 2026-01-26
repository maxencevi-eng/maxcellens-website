"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import VideoGallery from './VideoGallery';

type VideoItem = { url: string; columns?: 1 | 2 | 3 | 4 };
type Props = {
  keyName: string;
  initial?: Array<string | VideoItem>;
  className?: string;
};

export default function EditableVideoGallery({ keyName, initial = [], className }: Props) {
  const normalize = (arr: Array<string | VideoItem>): VideoItem[] => (arr || []).map((it) => {
    if (typeof it === 'string') return { url: it, columns: 1 };
    const o = it as VideoItem;
    const cols = Number(o.columns) || 1;
    const columns: 1 | 2 | 3 | 4 = (cols >= 1 && cols <= 4) ? (cols as 1 | 2 | 3 | 4) : 1;
    return { url: String(o.url || ''), columns };
  });
  const [videos, setVideos] = useState<VideoItem[]>(normalize(initial));
  const [editing, setEditing] = useState(false);
  const [singleUrl, setSingleUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editColumns, setEditColumns] = useState<1 | 2 | 3 | 4>(1);

  function extractYouTubeId(url: string) {
    try {
      if (!url) return '';
      const u = String(url);
      const short = u.match(/youtu\.be\/(.+)$/);
      if (short && short[1]) return short[1].split(/[?&]/)[0];
      const shorts = u.match(/shorts\/([^?&#\/]+)/);
      if (shorts && shorts[1]) return shorts[1].split(/[?&]/)[0];
      const embed = u.match(/embed\/(.+)$/);
      if (embed && embed[1]) return embed[1].split(/[?&]/)[0];
      const watch = u.match(/[?&]v=([^&]+)/);
      if (watch && watch[1]) return watch[1];
      return '';
    } catch (_) {
      return '';
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(keyName)}`);
        if (!resp.ok) return;
        const j = await resp.json().catch(() => ({}));
        const s = j?.settings || {};
        const raw = s[keyName];
        if (!mounted) return;
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const list = parsed.map((el: any) => {
              if (typeof el === 'string') return { url: String(el), columns: 1 as 1 | 2 | 3 | 4 };
              if (el && typeof el === 'object') {
                const cols = Number(el.columns) || 1;
                const columns: 1 | 2 | 3 | 4 = (cols >= 1 && cols <= 4) ? (cols as 1 | 2 | 3 | 4) : 1;
                return { url: String(el.url || ''), columns };
              }
              return { url: String(el || ''), columns: 1 as 1 | 2 | 3 | 4 };
            }).filter((x: any) => x.url) as VideoItem[];
            setVideos(list);
            return;
          }
        } catch (_) {
          // fall through to parse as newline/comma list
        }
        const arr = String(raw).split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
        if (arr.length) setVideos(arr.map((u) => ({ url: u, columns: 1 })));
      } catch (_) {
        // ignore
      }
    }
    load();
    function onUpdate() { load(); }
    window.addEventListener('site-settings-updated', onUpdate as EventListener);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', onUpdate as EventListener); };
  }, [keyName]);

  function openEditor() {
    setEditing(true);
  }

  function addSingleUrl() {
    const v = singleUrl.trim();
    if (!v) return;
    setVideos((prev) => [...prev, { url: v, columns: 1 }]);
    setSingleUrl('');
  }

  function removeAt(idx: number) {
    setVideos((prev) => {
      const copy = prev.slice();
      if (idx >= 0 && idx < copy.length) copy.splice(idx, 1);
      return copy;
    });
  }

  function move(from: number, to: number) {
    setVideos((prev) => {
      const copy = prev.slice();
      if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy;
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const list = videos.map((v) => ({ url: v.url, columns: v.columns || 1 }));
      const payload = { key: keyName, value: JSON.stringify(list) };
      const resp = await fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error('Save failed');
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: keyName, value: JSON.stringify(list) } })); } catch (_) {}
      setEditing(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} };
  }, []);

  return (
    <div className={className ?? ''}>
      {isAdmin ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <button className="btn-secondary" onClick={openEditor}>Modifier la galerie</button>
        </div>
      ) : null}

      <VideoGallery videos={videos} className={undefined} />

      {editing ? (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', padding: 20, width: 820, maxWidth: '98%', maxHeight: '86vh', overflowY: 'auto', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>Modifier la galerie — {keyName}</h3>
                <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>Une URL YouTube par élément. Coller une URL puis cliquer Ajouter.</div>
              </div>
              <div>
                <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }} aria-label="Fermer">✕</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="Coller une URL et cliquer Ajouter"
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e6e6e6' }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSingleUrl(); } }}
              />
              <button className="btn-primary" onClick={addSingleUrl} style={{ whiteSpace: 'nowrap' }}>Ajouter</button>
            </div>

            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0' }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>Aperçu (glisser-déposer pour réordonner) :</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {videos.length === 0 ? (
                  <div style={{ color: '#666' }}>Aucune URL pour l'instant.</div>
                ) : videos.map((v, i) => (
                  <div
                    key={`${v}-${i}`}
                    draggable
                    onDragStart={(ev) => { ev.dataTransfer?.setData('text/plain', String(i)); setDraggingIndex(i); ev.dataTransfer!.effectAllowed = 'move'; }}
                    onDragOver={(ev) => { ev.preventDefault(); setDragOverIndex(i); }}
                    onDragEnter={() => setDragOverIndex(i)}
                    onDragLeave={() => { if (dragOverIndex === i) setDragOverIndex(null); }}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      const src = Number(ev.dataTransfer?.getData('text/plain'));
                      if (isNaN(src)) return;
                      move(src, i);
                      setDragOverIndex(null);
                      setDraggingIndex(null);
                    }}
                    onDragEnd={() => { setDragOverIndex(null); setDraggingIndex(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, background: dragOverIndex === i ? '#e8f0ff' : 'transparent', border: '1px solid rgba(0,0,0,0.04)' }}
                  >
                    <div style={{ width: 36, textAlign: 'center', color: '#666' }}>{i + 1}</div>
                    {/* thumbnail */}
                    <div style={{ width: 60, flex: '0 0 60px' }}>
                      {(() => {
                        const id = extractYouTubeId(v.url || '');
                        if (id) {
                          const thumb = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
                          return <img src={thumb} alt="miniature" style={{ width: '100%', height: 'auto', borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }} />;
                        }
                        return <div style={{ width: '100%', height: 33, background: '#f0f0f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 10 }}>Aperçu</div>;
                      })()}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editIndex === i ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                          <select value={editColumns} onChange={(e) => setEditColumns(Number(e.target.value) as 1 | 2 | 3 | 4)} style={{ padding: 6, borderRadius: 6 }}>
                            <option value={1}>1 colonne</option>
                            <option value={2}>2 colonnes</option>
                            <option value={3}>3 colonnes</option>
                            <option value={4}>4 colonnes</option>
                          </select>
                          <button className="btn-primary" onClick={() => { const val = editValue.trim(); if (val) { setVideos(prev => { const copy = prev.slice(); copy[i] = { url: val, columns: editColumns }; return copy; }); setEditIndex(null); } }} style={{ padding: '6px 8px' }}>Save</button>
                          <button className="btn-secondary" onClick={() => setEditIndex(null)} style={{ padding: '6px 8px' }}>Cancel</button>
                        </div>
                        ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.url}</div>
                          <div style={{ color: '#666', fontSize: 12 }}>{v.columns === 1 ? '1-col' : v.columns === 2 ? '2-col' : v.columns === 3 ? '3-col' : '4-col'}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-secondary" onClick={() => { setEditIndex(i); setEditValue(v.url); setEditColumns(v.columns === 1 ? 1 : v.columns === 2 ? 2 : v.columns === 3 ? 3 : 4); }} style={{ padding: '6px 8px' }}>Éditer</button>
                      <button className="btn-secondary" onClick={() => { if (i > 0) move(i, i - 1); }} disabled={i === 0} style={{ padding: '6px 8px' }}>▲</button>
                      <button className="btn-secondary" onClick={() => { if (i < videos.length - 1) move(i, i + 1); }} disabled={i === videos.length - 1} style={{ padding: '6px 8px' }}>▼</button>
                      <button className="btn-secondary" onClick={() => removeAt(i)} style={{ padding: '6px 8px' }}>Suppr</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>Annuler</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
