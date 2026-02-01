"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

export default function ContactEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [html, setHtml] = useState('');
  const [photo, setPhoto] = useState<{ url?: string; path?: string } | null>(null);
  // Keep the original stored path so we can delete it if replaced on save
  const [originalPhotoPath, setOriginalPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_intro,contact_photo');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_intro) {
          try {
            const parsed = JSON.parse(String(s.contact_intro));
            setHtml(parsed || '');
          } catch (e) { setHtml(String(s.contact_intro || '')); }
        }
        if (s.contact_photo) {
          try {
            const parsed = JSON.parse(String(s.contact_photo));
            if (parsed && (parsed.url || parsed.path)) { setPhoto({ url: parsed.url, path: parsed.path }); setOriginalPhotoPath(parsed.path || null); }
            else if (typeof parsed === 'string') { setPhoto({ url: parsed }); setOriginalPhotoPath(null); }
          } catch (e) { setPhoto({ url: String(s.contact_photo) }); setOriginalPhotoPath(null); }
        }
      } catch (e) {
        // ignore
      }
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
      fd.append('category', 'contact');
      const currentPath = photo?.path || originalPhotoPath;
      if (currentPath) fd.append('old_path', currentPath);
      const resp = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Erreur d\u2019upload');
      const j = await resp.json();
      if (j?.webp) {
        setPhoto({ url: String(j.webp), path: String(j.path || '') });
        setOriginalPhotoPath(j.path ? String(j.path) : null);
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

  async function removePhoto() {
    if (!photo?.path) { setPhoto(null); setOriginalPhotoPath(null); return; }
    setError(null);
    try {
      const resp = await fetch('/api/admin/delete-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: photo.path }) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || `Erreur suppression fichier (${resp.status})`);
      setPhoto(null);
      setOriginalPhotoPath(null);
    } catch (err: any) {
      setError(err?.message || 'Erreur suppression');
    }
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      const tasks: Promise<Response>[] = [];
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_intro', value: JSON.stringify(html || '') }) }));
      tasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'contact_photo', value: JSON.stringify(photo || '') }) }));
      const res = await Promise.all(tasks);
      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }

      setOriginalPhotoPath(photo?.path || null);

      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'contact_intro', value: JSON.stringify(html || '') } })); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'contact_photo', value: JSON.stringify(photo || '') } })); } catch (_) {}

      if (onSaved) onSaved();
      setTimeout(() => onClose(), 300);
    } catch (err: any) { setError(err?.message || 'Erreur'); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', color: '#000', padding: 20, width: 820, maxWidth: '98%', maxHeight: '86vh', overflowY: 'auto', borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Modifier le bloc Contact</h3>
          <button onClick={() => onClose()} aria-label="Fermer" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)' }}>Photo</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="file" accept="image/*" onChange={async (e) => { const f = (e.target.files && e.target.files[0]) || null; if (f) await handleFileSelect(f); }} />
            {uploading ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>Téléchargement…</span> : null}
            {photo?.url ? <div style={{ marginLeft: 12 }}><img src={String(photo.url)} alt="preview" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} /></div> : null}
            {photo?.url ? <div style={{ marginLeft: 8 }}><button className="btn-secondary" onClick={removePhoto}>Supprimer</button></div> : null}
          </div>

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Texte</label>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ minHeight: 44, border: '1px solid #e6e6e6', borderRadius: 6, padding: 10, background: '#fff' }} dangerouslySetInnerHTML={{ __html: (html || '<p style="color:#999">Aucun</p>') }} />
              </div>
              <div>
                <button className="btn-ghost" onClick={() => setEditingText(true)}>Éditer</button>
              </div>
            </div>
          </div>

          {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button className="btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>

        {editingText ? (
          <React.Suspense fallback={null}>
            <RichTextModal title="Éditer Contact" initial={html} onClose={() => setEditingText(false)} onSave={async (h: string) => { setHtml(h); setEditingText(false); }} />
          </React.Suspense>
        ) : null}

      </div>
    </div>
  );
}
