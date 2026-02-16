"use client";
import React, { useEffect, useState, useRef } from 'react';

type Socials = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
};

const getStorage = (key: string) => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const setStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

export default function SocialLinksEditor({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [links, setLinks] = useState<Socials>({});
  const [iconStyle, setIconStyle] = useState<string>('style-outline');
  const [iconFiles, setIconFiles] = useState<{ [k: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=' + ['socialInstagram','socialFacebook','socialYouTube','socialTikTok','socialLinkedIn','socialIconStyle','socialIcon_instagram','socialIcon_facebook','socialIcon_youtube','socialIcon_tiktok','socialIcon_linkedin'].join(','));
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        setLinks({
          instagram: s.socialInstagram || getStorage('socialInstagram') || '',
          facebook: s.socialFacebook || getStorage('socialFacebook') || '',
          youtube: s.socialYouTube || getStorage('socialYouTube') || '',
          tiktok: s.socialTikTok || getStorage('socialTikTok') || '',
          linkedin: s.socialLinkedIn || getStorage('socialLinkedIn') || '',
        });
        if (s.socialIconStyle) setIconStyle(String(s.socialIconStyle));
        else {
          const v = getStorage('socialIconStyle');
          if (v) setIconStyle(v);
        }

        // load custom icon URLs if present
        try {
          if (s.socialIcon_instagram) { const v = String(s.socialIcon_instagram); setIconFiles(prev => ({ ...prev, instagram: v })); if (v.startsWith('http')) setSavedRemote(prev => ({ ...prev, instagram: true })); }
          if (s.socialIcon_facebook) { const v = String(s.socialIcon_facebook); setIconFiles(prev => ({ ...prev, facebook: v })); if (v.startsWith('http')) setSavedRemote(prev => ({ ...prev, facebook: true })); }
          if (s.socialIcon_youtube) { const v = String(s.socialIcon_youtube); setIconFiles(prev => ({ ...prev, youtube: v })); if (v.startsWith('http')) setSavedRemote(prev => ({ ...prev, youtube: true })); }
          if (s.socialIcon_tiktok) { const v = String(s.socialIcon_tiktok); setIconFiles(prev => ({ ...prev, tiktok: v })); if (v.startsWith('http')) setSavedRemote(prev => ({ ...prev, tiktok: true })); }
          if (s.socialIcon_linkedin) { const v = String(s.socialIcon_linkedin); setIconFiles(prev => ({ ...prev, linkedin: v })); if (v.startsWith('http')) setSavedRemote(prev => ({ ...prev, linkedin: true })); }
        } catch(_) {}
      } catch (_) {
        setLinks({
          instagram: getStorage('socialInstagram') || '',
          facebook: getStorage('socialFacebook') || '',
          youtube: getStorage('socialYouTube') || '',
          tiktok: getStorage('socialTikTok') || '',
          linkedin: getStorage('socialLinkedIn') || '',
        });
        const v = getStorage('socialIconStyle');
        if (v) setIconStyle(v);
      }
    }
    load();
    return () => { mounted = false; // revoke any created blob URLs
      try { if (tempPreviews.current && tempPreviews.current.length) { tempPreviews.current.forEach(u => { try { URL.revokeObjectURL(u); } catch(_){} }); tempPreviews.current = []; } } catch(_) {}
    };
  }, []);

  function setKey(k: keyof Socials, v: string) {
    setLinks(prev => ({ ...prev, [k]: v }));
  }

  async function uploadIcon(network: string, file: File | null) {
    if (!file) return { url: null, upsertOk: false, error: 'no file' } as any;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('network', network);
    const resp = await fetch('/api/admin/upload-icon', { method: 'POST', body: fd });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('[SocialLinksEditor] upload-icon failed', j);
      // return entire server payload (or at least its errors) so caller can inspect uploadOk/publicUrlOk
      return { ok: false, status: resp.status, ...(j || {}) } as any;
    }
    // return the whole server response so callers can read uploadOk/publicUrlOk/upsertOk etc.
    return { ok: true, status: resp.status, ...(j || {}) } as any;
  }

  const tempPreviews = useRef<string[]>([]);
  const [uploading, setUploading] = useState<{ [k: string]: boolean }>({});
  const anyUploading = Object.values(uploading).some(Boolean);

  async function createPreview(file: File) {
    return new Promise<string>((resolve, reject) => {
      let objUrl: string | null = null;
      try { objUrl = URL.createObjectURL(file); } catch (_) { objUrl = null; }
      if (objUrl) {
        const img = new Image();
        img.onload = () => resolve(objUrl as string);
        img.onerror = () => {
          try { URL.revokeObjectURL(objUrl as string); } catch(_){}
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(new Error('Preview generation failed'));
          fr.readAsDataURL(file);
        };
        img.src = objUrl;
      } else {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error('Preview generation failed'));
        fr.readAsDataURL(file);
      }
    });
  }

  const [savedRemote, setSavedRemote] = useState<{ [k: string]: boolean }>({});
  const [savedError, setSavedError] = useState<{ [k: string]: string | null }>({});

  // keep iconFiles in sync with any persisted remote icons (localStorage or server) so modal shows uploaded icons after saving
  useEffect(() => {
    function refreshSavedIcons() {
      const networks = ['instagram','facebook','youtube','tiktok','linkedin'];
      setIconFiles(prev => {
        const copy = { ...prev };
        for (const n of networks) {
          const v = getStorage(`socialIcon_${n}`);
          if (v) copy[n] = v;
        }
        return copy;
      });
      setSavedRemote(prev => {
        const copy = { ...prev };
        for (const n of networks) {
          const v = getStorage(`socialIcon_${n}`);
          copy[n] = Boolean(v && (v.startsWith('http://') || v.startsWith('https://')));
        }
        return copy;
      });
    }
    window.addEventListener('site-settings-updated', refreshSavedIcons as EventListener);
    // also run once on mount
    refreshSavedIcons();
    return () => window.removeEventListener('site-settings-updated', refreshSavedIcons as EventListener);
  }, []);

  async function handleFileSelect(network: string, file: File | null) {
    if (!file) return;
    setError(null);
    setSavedError(prev => ({ ...prev, [network]: null }));
    setUploading(prev => ({ ...prev, [network]: true }));
    setSavedRemote(prev => ({ ...prev, [network]: false }));


    // create immediate preview
    try {
      const preview = await createPreview(file);
      if (preview && preview.startsWith('blob:')) tempPreviews.current.push(preview);
      setIconFiles(prev => ({ ...prev, [network]: preview }));
    } catch (_) {
      setError("Impossible de générer l'aperçu local — l'upload continue cependant.");
    }

    try {
      const resp = await uploadIcon(network, file);
      const url = resp?.url || null;
      const upsertOk = Boolean(resp?.upsertOk);
      const upsertError = resp?.upsertError || resp?.error || null;
      const uploadOk = typeof resp?.uploadOk === 'boolean' ? resp.uploadOk : true;
      const uploadError = resp?.uploadError || null;
      const publicUrlOk = typeof resp?.publicUrlOk === 'boolean' ? resp.publicUrlOk : true;
      const publicUrlStatus = resp?.publicUrlStatus || null;

      if (!url || !uploadOk || !publicUrlOk) {
        const pieces: string[] = [];
        if (!uploadOk) pieces.push(uploadError || 'Upload failed');
        if (!publicUrlOk) pieces.push(`Public URL inaccessible (status ${publicUrlStatus || 'unknown'})`);
        if (!url) pieces.push(upsertError || 'No public URL returned');
        const msg = pieces.join(' — ');
        setSavedError(prev => ({ ...prev, [network]: msg }));
        setError(msg);
      } else {
        // revoke previous blob preview if any
        setIconFiles(prev => {
          try {
            const prevVal = prev[network];
            if (prevVal && prevVal.startsWith('blob:')) {
              try { URL.revokeObjectURL(prevVal); } catch (_) {}
              tempPreviews.current = tempPreviews.current.filter(u => u !== prevVal);
            }
          } catch(_){ }
          return { ...prev, [network]: url };
        });

        // if server upsert succeeded we mark savedRemote immediately, else we attempt applyUploadedUrl client-side
        if (upsertOk) {
          setSavedRemote(prev => ({ ...prev, [network]: true }));
          setSavedError(prev => ({ ...prev, [network]: null }));
        } else {
          // try to persist via applyUploadedUrl as fallback
          const ok = await applyUploadedUrl(network, url);
          setSavedRemote(prev => ({ ...prev, [network]: Boolean(ok) }));
          setSavedError(prev => ({ ...prev, [network]: ok ? null : (upsertError || 'Erreur persistance') }));
        }

        // update localStorage and refresh authoritative values
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) setStorage(`socialIcon_${network}`, url);
        try { await fetchSavedIcons(); } catch(_){}
      }
    } catch (err:any) {
      setError(String(err?.message || 'Erreur upload'));
      setSavedError(prev => ({ ...prev, [network]: String(err?.message || 'Erreur upload') }));
      console.error('[SocialLinksEditor] handleFileSelect error', err);
    } finally {
      setUploading(prev => ({ ...prev, [network]: false }));
    }
  }

  async function resetIcon(network: string) {
    // clear local preview and remote URL
    setIconFiles(prev => {
      try {
        const v = prev[network];
        if (v && v.startsWith('blob:')) {
          try { URL.revokeObjectURL(v); } catch (_) {}
          tempPreviews.current = tempPreviews.current.filter(u => u !== v);
        }
      } catch(_){}
      const copy = { ...prev };
      delete copy[network];
      return copy;
    });

    try { localStorage.removeItem(`socialIcon_${network}`); } catch(_){}
    try {
      await fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: `socialIcon_${network}`, value: '' }) });
    } catch(_){}
    try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: `socialIcon_${network}`, url: '' } })); } catch(_){}
  }

  async function applyUploadedUrl(network: string, url: string | null) {
    if (!url) return false;
    const key = `socialIcon_${network}`;
    setStorage(key, url);

    // persist to server and verify it saved
    try {
      const res = await fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key, value: url }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || 'Erreur lors de la persistance de l\'icône';
        setError(msg);
        setSavedError(prev => ({ ...prev, [network]: msg }));
        console.error('[SocialLinksEditor] applyUploadedUrl upsert failed', network, msg);
        return false;
      }

      setSavedError(prev => ({ ...prev, [network]: null }));
      // verify server value
      try {
        const g = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(key)}`);
        if (g.ok) {
          const jj = await g.json().catch(()=>({}));
          const serverVal = jj?.settings?.[key] || null;
          if (!serverVal || serverVal !== url) {
            // try once more
            await fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key, value: url }) }).catch(()=>{});
          }
        }
      } catch (_) {}

      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key, url } })); } catch(_){ }
      // also dispatch a no-detail update to encourage listeners to re-fetch authoritative settings
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch(_){ }
      return true;
    } catch (e:any) {
      setError(String(e?.message || 'Erreur lors de la persistance de l\'icône'));
      return false;
    }
  }
  // fetch authoritative icon URLs from the server and populate `iconFiles` and `savedRemote`
  async function fetchSavedIcons() {
    try {
      const resp = await fetch('/api/admin/site-settings?keys=' + ['socialIcon_instagram','socialIcon_facebook','socialIcon_youtube','socialIcon_tiktok','socialIcon_linkedin'].join(','));
      if (!resp.ok) return;
      const j = await resp.json();
      const s = j?.settings || {};
      setIconFiles(prev => ({
        ...prev,
        instagram: s.socialIcon_instagram || prev.instagram || getStorage('socialIcon_instagram') || '',
        facebook: s.socialIcon_facebook || prev.facebook || getStorage('socialIcon_facebook') || '',
        youtube: s.socialIcon_youtube || prev.youtube || getStorage('socialIcon_youtube') || '',
        tiktok: s.socialIcon_tiktok || prev.tiktok || getStorage('socialIcon_tiktok') || '',
        linkedin: s.socialIcon_linkedin || prev.linkedin || getStorage('socialIcon_linkedin') || '',
      }));
      setSavedRemote(prev => ({
        ...prev,
        instagram: Boolean(s.socialIcon_instagram || getStorage('socialIcon_instagram')),
        facebook: Boolean(s.socialIcon_facebook || getStorage('socialIcon_facebook')),
        youtube: Boolean(s.socialIcon_youtube || getStorage('socialIcon_youtube')),
        tiktok: Boolean(s.socialIcon_tiktok || getStorage('socialIcon_tiktok')),
        linkedin: Boolean(s.socialIcon_linkedin || getStorage('socialIcon_linkedin')),
      }));

      setSavedError(prev => ({
        ...prev,
        instagram: s.socialIcon_instagram ? null : (prev.instagram || null),
        facebook: s.socialIcon_facebook ? null : (prev.facebook || null),
        youtube: s.socialIcon_youtube ? null : (prev.youtube || null),
        tiktok: s.socialIcon_tiktok ? null : (prev.tiktok || null),
        linkedin: s.socialIcon_linkedin ? null : (prev.linkedin || null),
      }));
    } catch (_) {}
  }
  async function saveAll() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // wait briefly for ongoing uploads to finish (bounded wait)
      const start = Date.now();
      const timeoutMs = 30000; // 30s
      while (Object.values(uploading).some(Boolean) && (Date.now() - start) < timeoutMs) {
        await new Promise(r => setTimeout(r, 200));
      }
      if (Object.values(uploading).some(Boolean)) {
        throw new Error('Des uploads sont encore en cours. Attendez la fin des uploads puis réessayez.');
      }
      // persist only remote URLs (ignore temporary blob: previews)
      const iconTasks: Promise<Response>[] = [];
      for (const k of Object.keys(iconFiles)) {
        const val = iconFiles[k];
        if (!val) continue;
        // only persist if looks like a remote URL (http or https)
        if (val.startsWith('http://') || val.startsWith('https://')) {
          const keyName = `socialIcon_${k}`;
          iconTasks.push(fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: keyName, value: val }) }));
        }
      }
      const iconRes = await Promise.all(iconTasks);

      for (const r of iconRes) { if (!r.ok) { const jj = await r.json().catch(()=>({})); console.error('[SocialLinksEditor] icon save error response', jj); throw new Error(jj?.error || 'Erreur sauvegarde icônes'); } }

      const tasks = [
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'socialInstagram', value: links.instagram || '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'socialFacebook', value: links.facebook || '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'socialYouTube', value: links.youtube || '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'socialTikTok', value: links.tiktok || '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'socialLinkedIn', value: links.linkedin || '' }) }),
        fetch('/api/admin/site-settings', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ key: 'socialIconStyle', value: iconStyle || '' }) }),
      ];
      const res = await Promise.all(tasks);

      for (const r of res) {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          console.error('[SocialLinksEditor] save task error', j);
          throw new Error(j?.error || 'Erreur lors de la sauvegarde');
        }
      }

      setStorage('socialInstagram', links.instagram || '');
      setStorage('socialFacebook', links.facebook || '');
      setStorage('socialYouTube', links.youtube || '');
      setStorage('socialTikTok', links.tiktok || '');
      setStorage('socialLinkedIn', links.linkedin || '');
      setStorage('socialIconStyle', iconStyle || '');
      Object.keys(iconFiles).forEach(k => {
        const v = iconFiles[k];
        if (v && (v.startsWith('http://') || v.startsWith('https://'))) setStorage(`socialIcon_${k}`, v);
      });
      // refresh authoritative saved icon urls from server before notifying listeners
      try { await fetchSavedIcons(); } catch(_){}
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch(_){}

      setSuccess('Sauvegardé');
      if (onSaved) onSaved();
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const anySaveErrors = Object.values(savedError).some(Boolean);

  return (
    <div className="modal-overlay-mobile" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50000 }}>
      <div style={{ background: '#fff', color: '#000', padding: 20, width: 720, maxWidth: '98%', maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box', borderRadius: 8, position: 'relative' }}>
        <h3 style={{ marginTop: 0 }}>Modifier les réseaux</h3>
        {anySaveErrors ? (
          <div style={{ background: '#fff4f4', border: '1px solid #f2c2c2', padding: 8, marginBottom: 8, borderRadius: 6 }}>
            <strong style={{ color: '#a11' }}>Erreur de persistance des icônes :</strong>
            <div style={{ marginTop: 6 }}>
              {Object.entries(savedError).filter(([,v]) => v).map(([k,v]) => (
                <div key={k} style={{ fontSize: 13 }}><strong>{k}</strong>: {v}</div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Instagram</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ minWidth: 0, flex: 1 }} value={links.instagram || ''} onChange={(e) => setKey('instagram', e.target.value)} placeholder="https://instagram.com/..." />
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0] || null; if (!f) return; await handleFileSelect('instagram', f); }} />
            {uploading.instagram ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Téléchargement…</span>
            ) : null}
            {iconFiles.instagram ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={iconFiles.instagram} alt="instagram preview" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                {savedRemote.instagram ? <span style={{ color: '#2d6a4f', fontSize: 12 }}>Importée</span> : null}
                <button onClick={() => resetIcon('instagram')} type="button" style={{ fontSize: 11, padding: '4px 6px' }}>Réinitialiser</button>
                {savedError.instagram ? <div style={{ color: 'crimson', fontSize: 11, marginLeft: 6 }}>{savedError.instagram}</div> : null}

              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Facebook</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ minWidth: 0, flex: 1 }} value={links.facebook || ''} onChange={(e) => setKey('facebook', e.target.value)} placeholder="https://facebook.com/..." />
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0] || null; if (!f) return; await handleFileSelect('facebook', f); }} />
            {uploading.facebook ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Téléchargement…</span>
            ) : null}
            {iconFiles.facebook ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={iconFiles.facebook} alt="facebook preview" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                {savedRemote.facebook ? <span style={{ color: '#2d6a4f', fontSize: 12 }}>Importée</span> : null}
                <button onClick={() => resetIcon('facebook')} type="button" style={{ fontSize: 11, padding: '4px 6px' }}>Réinitialiser</button>
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)' }}>YouTube</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ minWidth: 0, flex: 1 }} value={links.youtube || ''} onChange={(e) => setKey('youtube', e.target.value)} placeholder="https://youtube.com/..." />
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0] || null; if (!f) return; await handleFileSelect('youtube', f); }} />
            {uploading.youtube ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Téléchargement…</span>
            ) : null}
            {iconFiles.youtube ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={iconFiles.youtube} alt="youtube preview" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                {savedRemote.youtube ? <span style={{ color: '#2d6a4f', fontSize: 12 }}>Importée</span> : null}
                <button onClick={() => resetIcon('youtube')} type="button" style={{ fontSize: 11, padding: '4px 6px' }}>Réinitialiser</button>
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)' }}>TikTok</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ minWidth: 0, flex: 1 }} value={links.tiktok || ''} onChange={(e) => setKey('tiktok', e.target.value)} placeholder="https://tiktok.com/..." />
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0] || null; if (!f) return; await handleFileSelect('tiktok', f); }} />
            {uploading.tiktok ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Téléchargement…</span>
            ) : null}
            {iconFiles.tiktok ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={iconFiles.tiktok} alt="tiktok preview" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                {savedRemote.tiktok ? <span style={{ color: '#2d6a4f', fontSize: 12 }}>Importée</span> : null}
                <button onClick={() => resetIcon('tiktok')} type="button" style={{ fontSize: 11, padding: '4px 6px' }}>Réinitialiser</button>
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)' }}>LinkedIn</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ minWidth: 0, flex: 1 }} value={links.linkedin || ''} onChange={(e) => setKey('linkedin', e.target.value)} placeholder="https://linkedin.com/..." />
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0] || null; if (!f) return; await handleFileSelect('linkedin', f); }} />
            {uploading.linkedin ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Téléchargement…</span>
            ) : null}
            {iconFiles.linkedin ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={iconFiles.linkedin} alt="linkedin preview" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                {savedRemote.linkedin ? <span style={{ color: '#2d6a4f', fontSize: 12 }}>Importée</span> : null}
                <button onClick={() => resetIcon('linkedin')} type="button" style={{ fontSize: 11, padding: '4px 6px' }}>Réinitialiser</button>
              </div>
            ) : null}
          </div>


        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Style d'icônes</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'style-outline', label: 'Outline' },
              { key: 'style-filled', label: 'Filled' },
              { key: 'style-circle', label: 'Circle' },
              { key: 'style-square', label: 'Square' },
              { key: 'style-brand', label: 'Brand' },
              { key: 'style-small', label: 'Small' },
              { key: 'style-labeled', label: 'Labeled' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setIconStyle(s.key)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: iconStyle === s.key ? '2px solid #111' : '1px solid #ddd',
                  background: iconStyle === s.key ? '#f3f4f6' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {(() => {
                    const pI = iconFiles.instagram || (typeof window !== 'undefined' ? localStorage.getItem('socialIcon_instagram') : null);
                    const pF = iconFiles.facebook || (typeof window !== 'undefined' ? localStorage.getItem('socialIcon_facebook') : null);
                    return (
                      <>
                        {pI ? <img src={pI} alt="insta" style={{ width: 18, height: 18, objectFit: 'contain' }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 6.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6z"/></svg>}
                        {pF ? <img src={pF} alt="fb" style={{ width: 18, height: 18, objectFit: 'contain' }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.6 9.9v-7H8.9v-2.9h1.5V9.4c0-1.5.9-2.4 2.3-2.4.7 0 1.4.1 1.4.1v1.6h-.8c-.8 0-1 .5-1 1v1.3h1.8l-.3 2.9h-1.5v7A10 10 0 0022 12z"/></svg>}
                      </>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving || anyUploading}>Annuler</button>
          <button onClick={saveAll} className="btn-primary" disabled={saving || anyUploading}>{saving ? 'Enregistrement...' : anyUploading ? 'Attente uploads...' : 'Enregistrer'}</button>
          {anyUploading ? <div style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>Un ou plusieurs fichiers sont en cours d'upload…</div> : null}
        </div>

        {error ? <div style={{ marginTop: 8, color: 'red' }}>{error}</div> : null}
        {success ? <div style={{ marginTop: 8, color: 'green' }}>{success}</div> : null}
      </div>
    </div>
  );
}
