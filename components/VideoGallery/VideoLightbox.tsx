'use client';

import React, { useEffect, useState } from 'react';

export type VideoLightboxItem = { url: string; isShort?: boolean };

type Props = {
  videos: VideoLightboxItem[];
  index: number;
  initialIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function getYouTubeId(url: string) {
  try {
    if (!url) return '';
    if (!url.includes('youtube') && !url.includes('youtu.be')) return url;
    const short = url.match(/youtu\.be\/(.+)$/);
    if (short?.[1]) return short[1].split(/[?&]/)[0];
    const shorts = url.match(/shorts\/([^?&#\/]+)/);
    if (shorts?.[1]) return shorts[1].split(/[?&]/)[0];
    const embed = url.match(/embed\/(.+)$/);
    if (embed?.[1]) return embed[1].split(/[?&]/)[0];
    const watch = url.match(/[?&]v=([^&]+)/);
    if (watch?.[1]) return watch[1];
    return url;
  } catch {
    return url;
  }
}

export default function VideoLightbox({ videos, index, initialIndex, onClose, onPrev, onNext }: Props) {
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const handlePrev = () => {
    setHasNavigated(true);
    onPrev();
  };
  const handleNext = () => {
    setHasNavigated(true);
    onNext();
  };

  if (videos.length === 0) return null;
  const safeIndex = Math.max(0, Math.min(index, videos.length - 1));
  const item = videos[safeIndex];
  const id = getYouTubeId(item.url);
  const isShort = item.isShort ?? false;
  const aspectRatio = isShort ? 9 / 16 : 16 / 9;
  const autoplay = index === initialIndex && !hasNavigated;
  const embedSrc = `https://www.youtube.com/embed/${id}${autoplay ? '?autoplay=1' : ''}`;
  const overlayStyle = {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    boxSizing: 'border-box' as const,
  };

  const columnStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    maxWidth: '100%',
    maxHeight: '100%',
  };

  const videoScrollStyle = {
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    display: 'flex',
    justifyContent: 'center',
  };

  const videoWrapStyle = {
    width: '95vw',
    maxWidth: '95vw',
    aspectRatio: String(aspectRatio),
    position: 'relative' as const,
    background: '#000',
    flexShrink: 0,
  };

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  };

  const btnStyle = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    width: 44,
    height: 44,
    borderRadius: '50%',
    cursor: 'pointer' as const,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse vidéo"
      style={overlayStyle}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute',
          right: 20,
          top: 20,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 28,
          cursor: 'pointer',
          padding: 8,
          zIndex: 2,
        }}
      >
        {'\u2715'}
      </button>

      <div style={columnStyle} onClick={(e) => e.stopPropagation()}>
        <div style={videoScrollStyle}>
          <div style={videoWrapStyle}>
          <iframe
            src={embedSrc}
            title={'Vidéo ' + (safeIndex + 1)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          </div>
        </div>

        {videos.length > 1 ? (
          <div style={navStyle}>
            <button type="button" aria-label="Vidéo précédente" onClick={(e) => { e.stopPropagation(); handlePrev(); }} style={btnStyle}>
              {'\u2190'}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, minWidth: 48, textAlign: 'center' }}>
              {safeIndex + 1}
              {' / '}
              {videos.length}
            </span>
            <button type="button" aria-label="Vidéo suivante" onClick={(e) => { e.stopPropagation(); handleNext(); }} style={btnStyle}>
              {'\u2192'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
