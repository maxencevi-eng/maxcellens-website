"use client";
import React, { useState } from 'react';
import type { ViewBlock } from '../types';
import { parseVideoUrl, getVideoLabel } from '../utils/parseVideoUrl';
import styles from './blocks.module.css';

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') && u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0] || null;
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace(/^\//, '').split('?')[0] || null;
    }
  } catch (_) {}
  return null;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export default function ViewVideoBlock({ block }: { block: ViewBlock }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = block.videoUrl ? parseVideoUrl(block.videoUrl) : null;
  const label = block.videoUrl ? getVideoLabel(block.videoUrl) : '';
  const thumbnail = block.videoUrl ? getYouTubeThumbnail(block.videoUrl) : null;
  const youtubeId = block.videoUrl ? getYouTubeId(block.videoUrl) : null;
  // youtube:// deep-link opens the app directly on iOS/Android
  const youtubeAppUrl = youtubeId ? `youtube://www.youtube.com/watch?v=${youtubeId}` : block.videoUrl || null;

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
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          className={styles.videoIframe}
          src={`${embedUrl}?autoplay=1&playsinline=1&rel=0`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vidéo"
        />
        {youtubeAppUrl && (
          <a
            href={youtubeAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.videoAppLink}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title="Ouvrir dans YouTube"
            aria-label="Ouvrir dans YouTube"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}><path d="M19.615 3.184A3 3 0 0 0 17.522 2C15.27 1.95 12 1.95 12 1.95s-3.27 0-5.522.05a3 3 0 0 0-2.093 1.134C3.6 4.48 3.6 7.2 3.6 7.2s0 2.72.785 4.016a3 3 0 0 0 2.093 1.134C8.73 12.4 12 12.4 12 12.4s3.27 0 5.522-.05a3 3 0 0 0 2.093-1.134C20.4 9.92 20.4 7.2 20.4 7.2s0-2.72-.785-4.016zM10 9.6V4.8l4.8 2.4L10 9.6z"/></svg>
            <span>App</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <button
      className={styles.videoThumb}
      onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
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
