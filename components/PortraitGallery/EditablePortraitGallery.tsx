"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from '../../lib/supabase';
import PortraitGallery from "./PortraitGallery";

type ImageItem = { id: string | number; image_url: string; image_path?: string; title?: string; width?: number; height?: number };

type EditablePortraitGalleryProps = {
  items: ImageItem[];
  /** Site settings key for load/save (e.g. portrait_gallery or gallery_photos_mariage) */
  settingsKey?: string;
  /** Page sent to upload API (e.g. portrait or galleries) */
  uploadPage?: string;
  /** Folder in medias bucket (e.g. Portrait/Galerie1 or Galleries/mariage) */
  uploadFolder?: string;
  /** Label affiché dans le bouton / modal (ex. "Lifestyle") */
  galleryLabel?: string;
};

export default function EditablePortraitGallery({ items: initialItems, settingsKey = 'portrait_gallery', uploadPage = 'portrait', uploadFolder = 'Portrait/Galerie1', galleryLabel }: EditablePortraitGalleryProps) {
  const [items, setItems] = useState<ImageItem[]>(() => (initialItems || []).map((it, i) => ({ id: String(it.id ?? i), image_url: it.image_url, image_path: (it as any).path || (it as any).image_path || undefined, title: it.title, width: it.width, height: it.height })));
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const hadInitialItemsRef = useRef<boolean>((initialItems || []).length > 0);
  const [galleryType, setGalleryType] = useState("masonry");
  const [columns, setColumns] = useState<number>(3);
  const [aspect, setAspect] = useState<string>("original");
  const [disposition, setDisposition] = useState<string>("vertical");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} };
  }, []);

  // load persisted data (if admin and a key exists) — réinitialiser quand on change de galerie (settingsKey)
  useEffect(() => {
    setItems([]); // évite d'afficher la galerie précédente pendant le chargement
    async function load() {
      try {
        const res = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(settingsKey)}`);
        const json = await res.json();
        const raw = json?.settings?.[settingsKey];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.items && Array.isArray(parsed.items)) {
            const seen = new Set<string>();
            const newItems = parsed.items.map((it: any, i: number) => {
              let id = String(it.id ?? i);
              if (seen.has(id)) id = `${id}-${i}`;
              seen.add(id);
              return { id, image_url: it.image_url || it.src || '', image_path: it.image_path ?? it.path, title: it.title || '', width: it.width, height: it.height };
            });
            const hadInitial = hadInitialItemsRef.current;
            if (newItems.length > 0 || !hadInitial) setItems(newItems);
          }
          if (parsed?.settings) {
            setGalleryType(parsed.settings.galleryType || "masonry");
            setColumns(parsed.settings.columns || 3);
            setAspect(parsed.settings.aspect || "original");
            setDisposition(parsed.settings.disposition || "vertical");
          }
        }
      } catch (e) {
        // ignore
      }
    }
    load();
  }, [settingsKey]);

  function openEditor() { setOpen(true); }
  function closeEditor() { setOpen(false); }

  function addItem(urlOrObj: string | { url: string; path?: string }) {
    if (!urlOrObj) return;
    const url = typeof urlOrObj === 'string' ? urlOrObj : urlOrObj.url;
    const path = typeof urlOrObj === 'string' ? undefined : urlOrObj.path;
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const next: ImageItem = { id: uniqueId, image_url: url, image_path: path, title: '' };
    setItems((s) => [...s, next]);
  }

  function removeItem(id: string) {
    const it = items.find((x) => x.id === id);
    setItems((s) => s.filter((i) => i.id !== id));
    if (it) {
      const payload = { page: uploadPage, paths: it.image_path ? [it.image_path] : [it.image_url] };
      fetch('/api/admin/delete-hero-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
    }
  }

  function replaceItem(id: string, urlOrObj: string | { url: string; path?: string }) {
    const newUrl = (urlOrObj as any)?.url || (urlOrObj as string);
    const newPath = (urlOrObj as any)?.path || undefined;
    setItems((s) => s.map((it) => it.id === id ? { ...it, image_url: newUrl, image_path: newPath } : it));
  }

  function moveItem(from: number, to: number) {
    setItems((s) => {
      const copy = [...s];
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m);
      return copy;
    });
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    dragIndex.current = idx;
    e.dataTransfer!.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  }
  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIndex.current === null) return;
    const from = dragIndex.current;
    const to = idx;
    if (from !== to) moveItem(from, to);
    dragIndex.current = null;
  }

  async function save() {
    try {
      const payload = { key: settingsKey, value: JSON.stringify({ items, settings: { galleryType, columns, aspect, disposition } }) };
      const resp = await fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!resp.ok) throw new Error('Save failed');
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: settingsKey, value: payload.value } })); } catch (_) {}
      setOpen(false);
    } catch (e) {
      console.error('save error', e);
    }
  }

  // editor UI
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        {isAdmin && (
          <button className="btn-secondary" onClick={openEditor} style={{ position: 'absolute', left: 12, top: -16, zIndex: 5, background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>Modifier la galerie{galleryLabel ? ` ${galleryLabel}` : ''}</button>
        )}
      </div>
      <div>
        {items && items.length > 0 ? (
          <PortraitGallery items={items} settings={{ galleryType, columns, aspect, disposition }} />
        ) : (
          <div style={{ minHeight: 80 }} />
        )}
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '95%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Modifier la galerie{galleryLabel ? ` ${galleryLabel}` : ''}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeEditor} style={{ padding: '6px 10px' }}>Annuler</button>
                <button onClick={save} style={{ background: '#111', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6 }}>Enregistrer</button>
              </div>
            </div>

            <div style={{ marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ display: 'block', marginBottom: 8 }}><strong>Type de galerie</strong></label>
                  <select value={galleryType} onChange={(e) => setGalleryType(e.target.value)}>
                    <option value="masonry">Masonry</option>
                    <option value="grid">Grid</option>
                    <option value="carousel">Carousel</option>
                    <option value="slideshow">Slideshow</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ display: 'block', marginBottom: 8 }}><strong>Colonnes</strong></label>
                  <select value={columns} onChange={(e) => setColumns(Number(e.target.value))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ display: 'block', marginBottom: 8 }}><strong>Format des images</strong></label>
                  <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
                    <option value="original">Original</option>
                    <option value="4:3">4:3</option>
                    <option value="16:9">16:9</option>
                    <option value="3:2">3:2</option>
                    <option value="1:1">1:1</option>
                    <option value="4:5">4:5</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ display: 'block', marginBottom: 8 }}><strong>Disposition</strong></label>
                  <select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* preview removed as requested */}

            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                <AddUrl onAdd={addItem} uploadPage={uploadPage} uploadFolder={uploadFolder} />
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Glisser pour réordonner • Cliquer sur une vignette pour remplacer</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {items.map((it, idx) => (
                  <div key={it.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={(e) => onDragOver(e, idx)} onDrop={(e) => onDrop(e, idx)} style={{ border: '1px solid #eee', padding: 6, borderRadius: 6, background: '#fafafa', position: 'relative', minHeight: 52 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, overflow: 'hidden', borderRadius: 6, background: '#f6f7f8' }}>
                        <img src={it.image_url} alt={it.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button onClick={() => removeItem(String(it.id))} style={{ background: 'transparent', border: '1px solid #e6e6e6', padding: '4px 6px', fontSize: 12 }}>Suppr.</button>
                            <SmallReplace oldPath={it.image_path} onReplace={(url) => replaceItem(String(it.id), url)} uploadPage={uploadPage} uploadFolder={uploadFolder} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button onClick={() => { if (idx > 0) moveItem(idx, idx - 1); }} title="Monter" style={{ padding: '4px 6px', fontSize: 11 }}>▲</button>
                      <button onClick={() => { if (idx < items.length - 1) moveItem(idx, idx + 1); }} title="Descendre" style={{ padding: '4px 6px', fontSize: 11 }}>▼</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function AddUrl({ onAdd, uploadPage = 'portrait', uploadFolder = 'Portrait/Galerie1' }: { onAdd: (arg: any) => void; uploadPage?: string; uploadFolder?: string }) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('page', uploadPage);
      fd.append('kind', 'image');
      fd.append('folder', uploadFolder);
      const res = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const json = await res.json();
      if (json && json.url) {
        onAdd({ url: json.url, path: json.path });
      } else if (json && json.error) {
        alert('Upload failed: ' + json.error);
      } else {
        alert('Upload failed');
      }
    } catch (e) {
      console.error('upload error', e);
      alert('Upload error');
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { const files = e.target.files; if (files && files.length) { Array.from(files).forEach((f) => uploadFile(f)); } if (fileRef.current) fileRef.current.value = ''; }} />
      <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 10px', borderRadius: 6, background: '#0b84ff', color: '#fff', border: 'none' }}>Importer</button>
    </div>
  );
}

function SmallReplace({ onReplace, oldPath, uploadPage = 'portrait', uploadFolder = 'Portrait/Galerie1' }: { onReplace: (arg: any) => void; oldPath?: string; uploadPage?: string; uploadFolder?: string }) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('page', uploadPage);
      fd.append('kind', 'image');
      fd.append('folder', uploadFolder);
      if (oldPath) fd.append('old_path', oldPath);
      const res = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const json = await res.json();
      if (json && json.url) {
        onReplace({ url: json.url, path: json.path });
      } else if (json && json.error) {
        alert('Upload failed: ' + json.error);
      } else {
        alert('Upload failed');
      }
    } catch (e) {
      console.error('upload error', e);
      alert('Upload error');
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); if (fileRef.current) fileRef.current.value = ''; }} />
      <button onClick={() => fileRef.current?.click()} style={{ padding: '4px 6px', border: '1px solid #e6e6e6', fontSize: 12 }}>Rempl</button>
    </>
  );
}
