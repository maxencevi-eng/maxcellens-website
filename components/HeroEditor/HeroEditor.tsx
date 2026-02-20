"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { page: string; onClose: () => void };

export default function HeroEditor({ page, onClose }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'image'|'video'|'slideshow'>('image');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFocus, setImageFocus] = useState<{x:number,y:number}>({x:50,y:50});
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [slides, setSlides] = useState<Array<{ url: string; path?: string }>>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const [speed, setSpeed] = useState<number>(3000);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const prevSlidesRef = useRef<string[]>([]);
  const prevImagePathRef = useRef<string | null>(null);
  const prevVideoPathRef = useRef<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const resp = await fetch(`/api/admin/hero?slug=${encodeURIComponent(page)}&raw=1`);
      if (!resp.ok) return;
      const j = await resp.json();
      const row = j?.data || null;
      if (!row) return;
      if (row.mode) setMode(row.mode);
      const s = row.settings || {};
      // prefer explicit settings.url but fall back to any public_url saved on the header row
      const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const buildPublic = (p: string) => (supabaseBase && !/^https?:\/\//i.test(p)) ? `${supabaseBase.replace(/\/$/, '')}/storage/v1/object/public/medias/${p}` : p;
      if (s.url) { setImagePreview(/^https?:\/\//i.test(s.url) ? s.url : buildPublic(s.url)); }
      else if ((row as any).public_url) { setImagePreview((row as any).public_url); }

      // if headers row stored image_path use that, otherwise check settings
      if ((row as any).image_path) setImagePath((row as any).image_path);
      if (s.image_path) setImagePath(s.image_path);
      if (s.focus) setImageFocus(s.focus);
      if (s.videoUrl) setVideoUrl(/^https?:\/\//i.test(s.videoUrl) ? s.videoUrl : buildPublic(s.videoUrl));
      if (s.slides) setSlides(Array.isArray(s.slides) ? (s.slides as any[]).map((p: any) => ({ url: (typeof p === 'string' && /^https?:\/\//i.test(p)) ? p : buildPublic(p), path: (typeof p === 'string' && !/^https?:\/\//i.test(p)) ? p : undefined })) : []);

      if (s.speed) setSpeed(Number(s.speed) || 3000);

      // store previous storage paths for later cleanup
      try {
        const rawSlides = Array.isArray(s.slides) ? s.slides : [];
        prevSlidesRef.current = rawSlides.filter((p: any) => typeof p === 'string' && p && !/^https?:\/\//i.test(p));
        prevImagePathRef.current = (s.image_path && typeof s.image_path === 'string') ? s.image_path : (s.url && typeof s.url === 'string' && !/^https?:\/\//i.test(s.url) ? s.url : null);
        prevVideoPathRef.current = (s.path && typeof s.path === 'string') ? s.path : null;
      } catch (_) {}
    } catch (e) {}
  }

  async function uploadFile(kind: 'image'|'video'|'slide', file: File, oldPath?: string | null) {
    setError(null); setSuccess(null); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('page', page);
      fd.append('kind', kind === 'slide' ? 'image' : kind);
      if (oldPath) fd.append('old_path', oldPath);
      const res = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) { setError(j?.error || 'Upload failed'); setLoading(false); return null; }
      // return both url and storage path so caller can persist path on save
      return { url: j?.url || null, path: j?.path || null };
    } catch (e:any) { setError(e?.message || 'Upload failed'); return null; } finally { setLoading(false); }
  }

  async function handleImageSelect(file: File | null) {
    if (!file) return;
    const prev = prevImagePathRef.current;
    const r = await uploadFile('image', file, prev);
    if (r && r.url) { setImagePreview(r.url); setImageFocus({x:50,y:50}); }
    if (r && r.path) setImagePath(r.path);
    prevImagePathRef.current = r?.path ?? null;
  }

  async function handleVideoSelect(file: File | null) {
    if (!file) return;
    const prev = prevVideoPathRef.current;
    const r = await uploadFile('video', file, prev);
    if (r && r.url) setVideoUrl(r.url);
    if (r && r.path) setVideoPath(r.path);
    prevVideoPathRef.current = r?.path ?? null;
  }

  async function handleSlideSelect(files: FileList | null) {
    if (!files) return;
    setLoading(true);
    try {
      for (let i=0;i<files.length;i++) {
        const f = files[i];
        const r = await uploadFile('slide', f);
        if (r && r.url) setSlides(prev => [...prev, { url: r.url, path: r.path || undefined }]);
      }
    } finally { setLoading(false); }
  }

  async function deletePaths(paths: string[]) {
    try {
      const p = paths.filter(Boolean).map(String);
      if (!p.length) return;
      await fetch('/api/admin/delete-hero-media', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ page, paths: p }) });
    } catch (_) {}
  }

  function onImageClick(e: React.MouseEvent) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setImageFocus({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  async function save() {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const settings: any = {};
      if (mode === 'image') { settings.url = imagePreview || ''; settings.focus = imageFocus; }
      if (mode === 'video') { settings.videoUrl = videoUrl || ''; if (videoPath) settings.path = videoPath; }
      if (mode === 'slideshow') { settings.slides = slides.map(s => s.path || s.url); settings.transition = 'simple'; settings.speed = speed; }

      const payload: any = { page, mode, settings };
      if (mode === 'image' && imagePath) payload.image_path = imagePath;
      // for video, include storage path if present
      if (mode === 'video' && videoPath) payload.video_path = videoPath;
      const resp = await fetch('/api/admin/hero', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const j = await resp.json();
      if (!resp.ok) {
        const raw = j?.error;
        const errMsg = typeof raw === 'object' ? JSON.stringify(raw) : String(raw || 'Save failed');
        const details = j?.details ? (typeof j.details === 'object' ? JSON.stringify(j.details) : String(j.details)) : null;
        setError(details ? `${errMsg} — ${details}` : errMsg);
        return;
      }

      // build public-facing settings for immediate UI update (convert storage paths to public urls)
      const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const buildPublic = (p: string) => (supabaseBase && !/^https?:\/\//i.test(p)) ? `${supabaseBase.replace(/\/$/, '')}/storage/v1/object/public/medias/${p}` : p;
      const displaySettings: any = { ...settings };
      try {
        if (mode === 'slideshow') {
          displaySettings.slides = (slides || []).map((s: any) => s.url || (s.path ? buildPublic(s.path) : s.path));
        }
        if (mode === 'image') {
          displaySettings.url = imagePreview || (imagePath ? buildPublic(imagePath) : imagePath) || '';
        }
        if (mode === 'video') {
          displaySettings.videoUrl = videoUrl || (videoPath ? buildPublic(videoPath) : videoPath) || '';
        }
      } catch (_) {}

      // notify listeners
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: `hero_${page}`, value: JSON.stringify({ mode, settings }) } })); } catch(_){ }
      try { window.dispatchEvent(new CustomEvent('hero-updated', { detail: { page, mode, settings: displaySettings } })); } catch(_){ }

      // Refresh server components so the new image is rendered server-side too
      try { router.refresh(); } catch (_) {}

      if (j?.warning) setSuccess(`Sauvegardé — ${j.warning}`);
      else setSuccess('Sauvegardé');

      // After successful save, attempt to remove any previous slide/image/video files
      try {
        // slides: compute new storage paths
        const newSlidePaths = (slides || []).map(s => s.path).filter(Boolean) as string[];
        const removed = prevSlidesRef.current.filter(p => !newSlidePaths.includes(p));
        if (removed.length) await deletePaths(removed);

        // image/video replacements cleanup
        if (mode === 'image') {
          const prevImg = prevImagePathRef.current;
          if (prevImg && prevImg !== imagePath) await deletePaths([prevImg]);
        }
        if (mode === 'video') {
          const prevVid = prevVideoPathRef.current;
          if (prevVid && prevVid !== videoPath) await deletePaths([prevVid]);
        }
      } catch (_) {}

      setTimeout(() => onClose(), 400);
    } catch (e:any) { setError(e?.message || 'Erreur'); } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay-mobile" style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', zIndex:9999 }}>
      <div style={{ background:'#fff', width:760, maxWidth:'98%', maxHeight:'80vh', overflowY:'auto', padding:20, borderRadius:8 }}>
        <h3 style={{ marginTop:0 }}>Modifier Hero — {page}</h3>
        <div style={{ display:'flex', gap:12 }}>
          <label style={{ display:'flex', gap:8, alignItems:'center' }}><input type="radio" checked={mode==='image'} onChange={() => setMode('image')} /> Image</label>
          <label style={{ display:'flex', gap:8, alignItems:'center' }}><input type="radio" checked={mode==='video'} onChange={() => setMode('video')} /> Vidéo</label>
          <label style={{ display:'flex', gap:8, alignItems:'center' }}><input type="radio" checked={mode==='slideshow'} onChange={() => setMode('slideshow')} /> Diaporama</label>
        </div>

        {mode === 'image' ? (
          <div style={{ marginTop:12 }}>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0] || null; await handleImageSelect(f); }} />
            </div>
            <p style={{ fontSize:13, color:'#666', marginTop:8, marginBottom:0, lineHeight:1.4 }}>
              L'image finale doit être en .webp et ≤ 1 MB.
            </p>
            {imagePreview ? (
              <div style={{ marginTop:12 }}>
                <div style={{ position:'relative', display:'inline-block' }}>
                  <img ref={imgRef} src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 320, cursor:'crosshair' }} onClick={onImageClick} />
                  <div style={{ position:'absolute', left:`calc(${imageFocus.x}% - 6px)`, top:`calc(${imageFocus.y}% - 6px)`, width:12, height:12, background:'#fff', border:'2px solid #111', borderRadius:999 }} />
                </div>
                <div style={{ fontSize:13, color:'#666', marginTop:6 }}>Cliquez sur l'image pour définir le point de focal (x/y: {imageFocus.x} / {imageFocus.y})</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === 'video' ? (
          <div style={{ marginTop:12 }}>
            <div style={{ display:'flex', gap:12 }}>
              <input type="text" placeholder="URL YouTube ou lien vidéo" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={{ flex:1 }} />
              <input type="file" accept="video/*" onChange={async (e) => { const f = e.target.files?.[0] || null; await handleVideoSelect(f); }} />
            </div>
            <div style={{ fontSize:13, color:'#666', marginTop:8 }}>Upload max 70MB. Si upload, un poster sera généré automatiquement.</div>
          </div>
        ) : null}

        {mode === 'slideshow' ? (
          <div style={{ marginTop:12 }}>
            <div style={{ display:'flex', gap:12 }}>
              <input type="file" accept="image/*" multiple onChange={async (e) => { await handleSlideSelect(e.target.files); }} />
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>

                <label style={{ display:'flex', gap:8, alignItems:'center' }}>Vitesse (ms)
                  <input type="number" value={speed} onChange={(e) => setSpeed(Number(e.target.value || 3000))} style={{ width:90 }} />
                </label>
              </div>
            </div>
            {slides.length ? (
              <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap', padding:8, borderRadius:8, background:'#fafafa', border:'1px solid #eee' }}>
                {slides.map((s,i) => (
                  <div key={`${s.url}-${i}`} draggable
                    onDragStart={(ev) => { ev.dataTransfer?.setData('text/plain', String(i)); setDraggingIndex(i); ev.dataTransfer!.effectAllowed = 'move'; }}
                    onDragOver={(ev) => { ev.preventDefault(); setDragOverIndex(i); }}
                    onDragEnter={() => setDragOverIndex(i)}
                    onDragLeave={() => { if (dragOverIndex === i) setDragOverIndex(null); }}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      const src = Number(ev.dataTransfer?.getData('text/plain'));
                      if (isNaN(src)) return;
                      setSlides(prev => {
                        const copy = prev.slice();
                        const [item] = copy.splice(src, 1);
                        copy.splice(i, 0, item);
                        return copy;
                      });
                      setDragOverIndex(null);
                      setDraggingIndex(null);
                    }}
                    onDragEnd={() => { setDragOverIndex(null); setDraggingIndex(null); }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:6, borderRadius:6, background: dragOverIndex === i ? '#e8f0ff' : 'transparent', boxShadow: dragOverIndex === i ? '0 0 0 2px rgba(0,123,255,0.08)' : undefined, cursor:'grab' }}>
                    <div style={{ position:'relative' }}>
                      <img src={s.url} style={{ width:72, height:72, objectFit:'cover', borderRadius:6, display:'block', border: draggingIndex === i ? '2px solid #007bff' : '1px solid #ddd' }} />
                      <div style={{ position:'absolute', left:6, top:6, background:'rgba(0,0,0,0.6)', color:'#fff', padding:'2px 6px', borderRadius:4, fontSize:12 }}>{i+1}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button type="button" onClick={() => setSlides(prev => {
                          if (i <= 0) return prev;
                          const copy = prev.slice(); const [it] = copy.splice(i,1); copy.splice(i-1,0,it); return copy;
                        })} disabled={i===0} style={{ padding:'6px 8px' }}>◀</button>
                        <button type="button" onClick={() => setSlides(prev => {
                          if (i >= prev.length-1) return prev;
                          const copy = prev.slice(); const [it] = copy.splice(i,1); copy.splice(i+1,0,it); return copy;
                        })} disabled={i===slides.length-1} style={{ padding:'6px 8px' }}>▶</button>
                      </div>
                      <button onClick={async () => {
                        try {
                          if (s.path && !/^https?:\/\//i.test(s.path)) {
                            await deletePaths([s.path]);
                          }
                        } catch (_) {}
                        setSlides(prev => prev.filter((_,idx)=>idx!==i));
                      }} type="button" style={{ padding:'6px 8px', alignSelf:'flex-start' }}>Suppr</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
        {error ? <div style={{ color:'crimson', marginTop:8 }}>{error}</div> : null}
        {success ? <div style={{ color:'green', marginTop:8 }}>{success}</div> : null}
      </div>
    </div>
  );
}