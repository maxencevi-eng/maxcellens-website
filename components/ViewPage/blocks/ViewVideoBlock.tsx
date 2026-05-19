"use client";
import React, { useState } from 'react';
import type { ViewBlock } from '../types';
import { parseVideoUrl, getVideoLabel } from '../utils/parseVideoUrl';
import styles from './blocks.module.css';

function getYouTubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') && u.pathname === '/watch') {
      id = u.searchParams.get('v');
    } else if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') && u.pathname.startsWith('/shorts/')) {
      id = u.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0] || null;
    } else if (u.hostname === 'youtu.be') {
      id = u.pathname.replace(/^\//, '').split('?')[0] || null;
    }
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  } catch (_) {}
  return null;
}

export default function ViewVideoBlock({ block }: { block: ViewBlock }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = block.videoUrl ? parseVideoUrl(block.videoUrl) : null;
  const label = block.videoUrl ? getVideoLabel(block.videoUrl) : '';
  // Fix 4: get YouTube thumbnail
  const thumbnail = block.videoUrl ? getYouTubeThumbnail(block.videoUrl) : null;

  if (!block.videoUrl) {
    return (
      <div className={styles.videoEmpty} style={{ color: block.textColor || undefined }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={32} height={32}><polygon points="5,3 19,12 5,21" /></svg>
        <span>Vidéo</span>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <a href={block.videoUrl} target="_blank" rel="noopener noreferrer" className={styles.videoFallback} style={{ color: block.textColor || undefined }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={28} height={28}><polygon points="5,3 19,12 5,21" /></svg>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Voir la vidéo</div>
          {label && <div style={{ fontSize: 11, opacity: 0.6 }}>{label}</div>}
        </div>
      </a>
    );
  }

  if (playing) {
    return (
      <iframe
        className={styles.videoIframe}
        src={`${embedUrl}?autoplay=1`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        title="Vidéo"
      />
    );
  }

  // Fix 4: show thumbnail with play overlay
  return (
    <button
      className={styles.videoThumb}
      onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Lire la vidéo"
      style={{ color: block.textColor || undefined }}
    >
      {thumbnail && (
        <img src={thumbnail} alt="" className={styles.videoThumbnailImg} />
      )}
      <div className={styles.videoPlayIcon}>
        <svg viewBox="0 0 24 24" fill="currentColor" width={36} height={36}><polygon points="5,3 19,12 5,21" /></svg>
      </div>
      {label && !thumbnail && <div className={styles.videoLabel}>{label}</div>}
    </button>
  );
}
