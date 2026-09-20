"use client";
import React, { useRef, useState } from 'react';
import { AdminButton, AdminNotice, TextField } from '../../admin';
import { youtubeCardId, type ImageCard } from './imageCardsDefs';

export default function VideoCardField({ card, onChange }: { card: ImageCard; onChange: (patch: Partial<ImageCard>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const youtubeUrl = card.video?.kind === 'youtube' ? card.video.url : !card.video && youtubeCardId(card.href) ? card.href : '';
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file); form.append('page', 'project-cards'); form.append('kind', 'video');
      const response = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Import impossible');
      onChange({ video: { kind: 'file', url: result.url, path: result.path }, href: '' });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <TextField label="Lien YouTube" value={youtubeUrl} onChange={url => onChange({ video: url ? { kind: 'youtube', url } : null, href: '' })} placeholder="https://www.youtube.com/watch?v=…" disabled={busy} error={youtubeUrl && !youtubeCardId(youtubeUrl) ? 'Saisissez un lien YouTube valide.' : undefined} />
    <input ref={input} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    <AdminButton disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Import en cours…' : 'Importer une vidéo'}</AdminButton>
    {card.video?.kind === 'file' && <video src={card.video.url} controls preload="metadata" style={{ width: '100%', maxHeight: 180 }} />}
    {card.video && <AdminButton disabled={busy} onClick={() => onChange({ video: null, href: '' })}>Retirer la vidéo</AdminButton>}
    {error && <AdminNotice tone="danger">{error}</AdminNotice>}
  </>;
}
