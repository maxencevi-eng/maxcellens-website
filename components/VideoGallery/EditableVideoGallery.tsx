"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import VideoGallery from './VideoGallery';
import type { GallerySettings } from './VideoGallery';
import styles from './VideoGallery.module.css';

type VideoItem = { url: string; columns?: 1 | 2 | 3 | 4; cover?: { url: string; path?: string }; title?: string };
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
    return { url: String(o.url || ''), columns, cover: o.cover, title: o.title };
  });
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [editing, setEditing] = useState(false);
  const [singleUrl, setSingleUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editColumns, setEditColumns] = useState<1 | 2 | 3 | 4>(1);
  const [editTitle, setEditTitle] = useState<string>('');
  const [uploadingCoverIndex, setUploadingCoverIndex] = useState<number | null>(null);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settingsKey = `${keyName}_gallery_settings`;

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
    setHasFetched(false);
    async function load() {
      try {
        const resp = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(`${keyName},${settingsKey}`)}`);
        if (!mounted) return;
        if (!resp.ok) {
          setHasFetched(true);
          setVideos(normalize(initial));
          return;
        }
        const j = await resp.json().catch(() => ({}));
        const s = j?.settings || {};

        // Load gallery settings
        const rawSettings = s[settingsKey];
        if (rawSettings) {
          try {
            const parsed = JSON.parse(rawSettings);
            if (parsed && typeof parsed === 'object') setGallerySettings(parsed);
          } catch (_) {}
        }

        const raw = s[keyName];
        if (!mounted) return;
        setHasFetched(true);
        if (!raw) {
          setVideos(normalize(initial));
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const list = parsed.map((el: any) => {
              if (typeof el === 'string') return { url: String(el), columns: 1 as 1 | 2 | 3 | 4 };
              if (el && typeof el === 'object') {
                const cols = Number(el.columns) || 1;
                const columns: 1 | 2 | 3 | 4 = (cols >= 1 && cols <= 4) ? (cols as 1 | 2 | 3 | 4) : 1;
                const cover = el.cover && (el.cover.url || el.cover.path) ? { url: String(el.cover.url || el.cover.path), path: el.cover.path } : undefined;
                return { url: String(el.url || ''), columns, cover, title: el.title || undefined };
              }
              return { url: String(el || ''), columns: 1 as 1 | 2 | 3 | 4 };
            }).filter((x: any) => x.url) as VideoItem[];
            setVideos(list.length > 0 ? list : normalize(initial));
            return;
          }
        } catch (_) {
          // fall through to parse as newline/comma list
        }
        const arr = String(raw).split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
        setVideos(arr.length > 0 ? arr.map((u) => ({ url: u, columns: 1 })) : normalize(initial));
      } catch (_) {
        if (mounted) {
          setHasFetched(true);
          setVideos(normalize(initial));
        }
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

  async function uploadCover(index: number, file: File) {
    setUploadingCoverIndex(index);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('page', 'home');
      fd.append('kind', 'image');
      fd.append('folder', `videos/${keyName}/${index}`);
      const item = videos[index];
      if (item?.cover?.path) fd.append('old_path', item.cover.path);
      const resp = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? 'Erreur upload');
      if (j?.url) {
        setVideos((prev) => prev.map((v, idx) => idx === index ? { ...v, cover: { url: j.url, path: j.path ?? undefined } } : v));
      } else throw new Error('Pas d\'URL retournée');
    } catch (e) {
      alert((e as Error)?.message ?? 'Erreur upload couverture');
    } finally {
      setUploadingCoverIndex(null);
    }
  }

  function removeCover(index: number) {
    setVideos((prev) => prev.map((v, idx) => idx === index ? { ...v, cover: undefined } : v));
  }

  async function save() {
    setSaving(true);
    try {
      const list = videos.map((v) => ({ url: v.url, columns: v.columns || 1, cover: v.cover || undefined, title: v.title || undefined }));
      const payload = { key: keyName, value: JSON.stringify(list) };
      const resp = await fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error('Save failed');

      // Save gallery settings
      const settingsPayload = { key: settingsKey, value: JSON.stringify(gallerySettings) };
      const resp2 = await fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsPayload) });
      if (!resp2.ok) throw new Error('Save settings failed');

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
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <button onClick={openEditor} className="btn-secondary" style={{ position: 'absolute', left: 12, top: -16, zIndex: 5, background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>Modifier la galerie</button>
        </div>
      ) : null}

      <VideoGallery videos={hasFetched ? videos : []} className={undefined} gallerySettings={gallerySettings} />

      {editing ? (
        <div className={`modal-overlay-mobile ${styles.modalOverlay}`} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 9999, padding: 16 }}>
          <div className={styles.modalBox} style={{ background: '#fff', padding: 20, width: 820, maxWidth: '98%', maxHeight: '86vh', overflowY: 'auto', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.06)' }}>
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

            {/* Gallery Settings Panel */}
            <div style={{ marginTop: 16, border: '1px solid #e6e6e6', borderRadius: 10, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8f8f8', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#333' }}
              >
                <span>⚙ Style et mise en page</span>
                <span style={{ transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
              </button>
              {settingsOpen && (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Padding */}
                  <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                    <legend style={{ fontSize: 13, fontWeight: 600, color: '#555', padding: '0 6px' }}>Marge intérieure (px)</legend>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Bureau (desktop)</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 100px' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>Vertical</span>
                        <input
                          type="number" min={0} max={200}
                          value={gallerySettings.paddingVDesktop ?? 24}
                          onChange={(e) => setGallerySettings({ ...gallerySettings, paddingVDesktop: Number(e.target.value) || 0 })}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 100px' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>Horizontal</span>
                        <input
                          type="number" min={0} max={200}
                          value={gallerySettings.paddingHDesktop ?? 0}
                          onChange={(e) => setGallerySettings({ ...gallerySettings, paddingHDesktop: Number(e.target.value) || 0 })}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' }}
                        />
                      </label>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Mobile</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 100px' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>Vertical</span>
                        <input
                          type="number" min={0} max={200}
                          value={gallerySettings.paddingVMobile ?? 16}
                          onChange={(e) => setGallerySettings({ ...gallerySettings, paddingVMobile: Number(e.target.value) || 0 })}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 100px' }}>
                        <span style={{ fontSize: 11, color: '#888' }}>Horizontal</span>
                        <input
                          type="number" min={0} max={200}
                          value={gallerySettings.paddingHMobile ?? 0}
                          onChange={(e) => setGallerySettings({ ...gallerySettings, paddingHMobile: Number(e.target.value) || 0 })}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' }}
                        />
                      </label>
                    </div>
                  </fieldset>

                  {/* Gap + Border Radius */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 120px' }}>
                      <span style={{ fontSize: 12, color: '#666' }}>Espacement (px)</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={gallerySettings.gap ?? 12}
                        onChange={(e) => setGallerySettings({ ...gallerySettings, gap: Number(e.target.value) || 0 })}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 120px' }}>
                      <span style={{ fontSize: 12, color: '#666' }}>Arrondi des bords (px)</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={gallerySettings.borderRadius ?? 0}
                        onChange={(e) => setGallerySettings({ ...gallerySettings, borderRadius: Number(e.target.value) || 0 })}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: '100%' }}
                      />
                    </label>
                  </div>

                  {/* Shadow + Glossy + Titles — same row on desktop */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 140px' }}>
                      <span style={{ fontSize: 12, color: '#666' }}>Ombre portée</span>
                      <select
                        value={gallerySettings.shadow || 'none'}
                        onChange={(e) => setGallerySettings({ ...gallerySettings, shadow: e.target.value as GallerySettings['shadow'] })}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
                      >
                        <option value="none">Aucune</option>
                        <option value="light">Légère</option>
                        <option value="medium">Moyenne</option>
                        <option value="heavy">Forte</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: '0 0 auto', paddingTop: 22 }}>
                      <input
                        type="checkbox"
                        checked={gallerySettings.glossy ?? false}
                        onChange={(e) => setGallerySettings({ ...gallerySettings, glossy: e.target.checked })}
                      />
                      <span style={{ fontSize: 13 }}>Glossy</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: '0 0 auto', paddingTop: 22 }}>
                      <input
                        type="checkbox"
                        checked={gallerySettings.showTitle ?? false}
                        onChange={(e) => setGallerySettings({ ...gallerySettings, showTitle: e.target.checked })}
                      />
                      <span style={{ fontSize: 13 }}>Titres</span>
                    </label>
                  </div>

                  {/* Title detail settings — visible only when titles enabled */}
                  {(gallerySettings.showTitle) && (
                  <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', margin: 0 }}>
                    <legend style={{ fontSize: 13, fontWeight: 600, color: '#555', padding: '0 6px' }}>Réglages titres</legend>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 100px' }}>
                          <span style={{ fontSize: 11, color: '#888' }}>Position</span>
                          <select
                            value={gallerySettings.titlePosition || 'bottom'}
                            onChange={(e) => setGallerySettings({ ...gallerySettings, titlePosition: e.target.value as GallerySettings['titlePosition'] })}
                            style={{ padding: 5, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                          >
                            <option value="top">Haut</option>
                            <option value="center">Centre</option>
                            <option value="bottom">Bas</option>
                          </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 80px' }}>
                          <span style={{ fontSize: 11, color: '#888' }}>Taille (px)</span>
                          <input
                            type="number"
                            min={8}
                            max={40}
                            value={gallerySettings.titleFontSize ?? 14}
                            onChange={(e) => setGallerySettings({ ...gallerySettings, titleFontSize: Number(e.target.value) || 14 })}
                            style={{ padding: 5, borderRadius: 6, border: '1px solid #ddd', fontSize: 12, width: '100%' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, color: '#888' }}>Couleur texte</span>
                          <input
                            type="color"
                            value={gallerySettings.titleColor || '#ffffff'}
                            onChange={(e) => setGallerySettings({ ...gallerySettings, titleColor: e.target.value })}
                            style={{ width: 36, height: 28, padding: 0, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, color: '#888' }}>Fond titre</span>
                          <input
                            type="color"
                            value={gallerySettings.titleBg || '#000000'}
                            onChange={(e) => {
                              // Convert hex to rgba with opacity
                              const hex = e.target.value;
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              setGallerySettings({ ...gallerySettings, titleBg: `rgba(${r},${g},${b},0.6)` });
                            }}
                            style={{ width: 36, height: 28, padding: 0, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
                          />
                        </label>
                      </div>
                  </fieldset>
                  )}
                </div>
              )}
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
                    className={styles.modalItemRow}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, background: dragOverIndex === i ? '#e8f0ff' : 'transparent', border: '1px solid rgba(0,0,0,0.04)' }}
                  >
                    <div style={{ width: 36, flexShrink: 0, textAlign: 'center', color: '#666' }}>{i + 1}</div>
                    {/* thumbnail */}
                    <div style={{ width: 60, flex: '0 0 60px' }} className={styles.modalItemThumb}>
                      {(() => {
                        const id = extractYouTubeId(v.url || '');
                        if (v.cover?.url) {
                          return <img src={v.cover.url} alt="couverture" style={{ width: '100%', height: 'auto', borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }} />;
                        }
                        if (id) {
                          const thumb = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
                          const onThumbError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                            const el = e.target as HTMLImageElement;
                            const src = el.src || '';
                            if (src.includes('maxresdefault')) {
                              el.src = `https://img.youtube.com/vi/${id}/sddefault.jpg`;
                            } else if (src.includes('sddefault')) {
                              el.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
                            } else {
                              const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='90' role='img' aria-label='Vidéo YouTube'><rect fill='%23111111' width='100%' height='100%'/><circle cx='50%' cy='50%' r='24' fill='rgba(0,0,0,0.55)'/><polygon points='75,45 75,35 90,45 75,55' fill='%23f5f5f5'/></svg>`;
                              el.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
                              el.onerror = null;
                            }
                          };
                          return <img src={thumb} alt="miniature" style={{ width: '100%', height: 'auto', borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }} onError={onThumbError} />;
                        }
                        return <div style={{ width: '100%', height: 33, background: '#f0f0f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 10 }}>Aperçu</div>;
                      })()}
                    </div>

                    {/* Image de couverture */}
                    <div style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Couverture</span>
                      {v.cover?.url ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <img src={v.cover.url} alt="" style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }} />
                          <button type="button" className="btn-ghost" style={{ fontSize: 11, color: '#c00' }} onClick={() => removeCover(i)}>Supprimer</button>
                        </div>
                      ) : null}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingCoverIndex === i}
                          style={{ width: 0, opacity: 0, position: 'absolute' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadCover(i, f);
                            e.target.value = '';
                          }}
                        />
                        <span style={{ textDecoration: 'underline', color: 'var(--fg)' }}>{uploadingCoverIndex === i ? 'Upload…' : 'Choisir une image'}</span>
                      </label>
                    </div>

                    <div className={styles.modalItemContent} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editIndex === i ? (
                        <div className={styles.modalItemEditRow} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="URL YouTube" style={{ flex: '1 1 200px', minWidth: 0, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titre (optionnel)" style={{ flex: '1 1 140px', minWidth: 0, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
                          <select value={editColumns} onChange={(e) => setEditColumns(Number(e.target.value) as 1 | 2 | 3 | 4)} style={{ padding: 6, borderRadius: 6 }}>
                            <option value={1}>1 colonne</option>
                            <option value={2}>2 colonnes</option>
                            <option value={3}>3 colonnes</option>
                            <option value={4}>4 colonnes</option>
                          </select>
                          <button className="btn-primary" onClick={() => { const val = editValue.trim(); if (val) { setVideos(prev => { const copy = prev.slice(); copy[i] = { ...copy[i], url: val, columns: editColumns, title: editTitle.trim() || undefined }; return copy; }); setEditIndex(null); } }} style={{ padding: '6px 8px' }}>Save</button>
                          <button className="btn-secondary" onClick={() => setEditIndex(null)} style={{ padding: '6px 8px' }}>Cancel</button>
                        </div>
                        ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.url}
                            {v.title ? <span style={{ marginLeft: 8, color: '#999', fontSize: 11 }}>"{v.title}"</span> : null}
                          </div>
                          <div style={{ color: '#666', fontSize: 12, flexShrink: 0 }}>{v.columns === 1 ? '1-col' : v.columns === 2 ? '2-col' : v.columns === 3 ? '3-col' : '4-col'}</div>
                        </div>
                      )}
                    </div>
                    <div className={styles.modalItemActions} style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn-secondary" onClick={() => { setEditIndex(i); setEditValue(v.url); setEditColumns(v.columns === 1 ? 1 : v.columns === 2 ? 2 : v.columns === 3 ? 3 : 4); setEditTitle(v.title || ''); }} style={{ padding: '6px 8px' }}>Éditer</button>
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
