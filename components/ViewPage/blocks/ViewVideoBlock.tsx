"use client";
import React from 'react';
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

function getYouTubeThumbnail(url: string): { src: string; fallback: string } | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  return {
    src: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    fallback: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
}

interface Props {
  block: ViewBlock;
  onOpenLightbox?: () => void;
}

export default function ViewVideoBlock({ block, onOpenLightbox }: Props) {
  const embedUrl = block.videoUrl ? parseVideoUrl(block.videoUrl) : null;
  const label = block.videoUrl ? getVideoLabel(block.videoUrl) : '';
  const thumbnailData = block.videoUrl ? getYouTubeThumbnail(block.videoUrl) : null;

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

  return (
    <button
      className={styles.videoThumb}
      onClick={(e) => { e.stopPropagation(); onOpenLightbox?.(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-label="Lire la vidéo"
      style={{ color: block.textColor || undefined }}
    >
      {thumbnailData && (
        <img
          src={thumbnailData.src}
          alt=""
          className={`${styles.videoThumbnailImg}${block.size === 'tall' ? ` ${styles.videoThumbnailImgZoom}` : ''}`}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = thumbnailData.fallback; }}
        />
      )}
      <div className={styles.videoPlayIcon}>
        <svg viewBox="0 0 24 24" fill="currentColor" width={36} height={36}><polygon points="5,3 19,12 5,21" /></svg>
      </div>
      {label && !thumbnailData && <div className={styles.videoLabel}>{label}</div>}
    </button>
  );
}
