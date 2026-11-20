'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type VideoLightboxItem = { url: string; embedUrl?: string; isShort?: boolean; kind?: 'youtube' | 'file' | 'linkedin'; poster?: string };

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

const ArrowIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {dir === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export default function VideoLightbox({ videos, index, initialIndex, onClose, onPrev, onNext }: Props) {
  const [hasNavigated, setHasNavigated] = useState(false);
  // Proportions réelles des vidéos lues en direct (fichier / LinkedIn) : 16/9 par défaut
  const [fileRatio, setFileRatio] = useState(16 / 9);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext]);

  const safeIndex = Math.max(0, Math.min(index, videos.length - 1));
  const item = videos[safeIndex];
  const autoplay = index === initialIndex && !hasNavigated;
  // Instagram/in-app browsers block autoplay — only request it in standard browsers
  const canAutoplay = autoplay && (typeof navigator === 'undefined' || !/Instagram|FBAN|FBAV/i.test(navigator.userAgent));

  // Lecture directe : si le navigateur refuse le son, on relance en muet plutôt que de rester figé
  useEffect(() => {
    setFileRatio(16 / 9);
    const v = videoRef.current;
    if (!v || !canAutoplay) return;
    const p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }
  }, [item?.url, item?.kind, canAutoplay]);

  if (videos.length === 0 || !item) return null;

  const handlePrev = () => { setHasNavigated(true); onPrev(); };
  const handleNext = () => { setHasNavigated(true); onNext(); };

  const isFile = item.kind === 'file';
  const isLinkedInEmbed = item.kind === 'linkedin';
  const isShort = item.isShort ?? false;
  const id = getYouTubeId(item.url);
  const embedBase = item.embedUrl ?? `https://www.youtube.com/embed/${id}`;
  const sep = embedBase.includes('?') ? '&' : '?';
  // Le lecteur LinkedIn ne gère ni l'autoplay ni les paramètres YouTube
  const embedSrc = isLinkedInEmbed
    ? embedBase
    : `${embedBase}${sep}${canAutoplay ? 'autoplay=1&' : ''}playsinline=1&rel=0&modestbranding=1`;

  const ratio = isFile ? fileRatio : isShort ? 9 / 16 : 16 / 9;
  // La vidéo tient toujours dans l'écran, en largeur comme en hauteur
  const frameStyle: React.CSSProperties = {
    position: 'relative',
    width: `min(94vw, calc(78vh * ${ratio}))`,
    aspectRatio: String(ratio),
    background: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
    transition: 'width 0.25s ease',
  };

  const roundBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff',
    width: 46,
    height: 46,
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'background 0.2s ease, transform 0.2s ease',
  };
  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse vidéo"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50000,
        background: 'radial-gradient(ellipse at center, rgba(20,20,20,0.94) 0%, rgba(0,0,0,0.97) 70%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onMouseEnter={hoverOn}
        onMouseLeave={hoverOff}
        style={{ ...roundBtn, position: 'absolute', right: 18, top: 18, zIndex: 2 }}
      >
        <CloseIcon />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={frameStyle}>
          {isFile ? (
            <video
              key={item.url}
              ref={videoRef}
              src={item.url}
              poster={item.poster}
              controls
              autoPlay={canAutoplay}
              playsInline
              preload="auto"
              controlsList="nodownload"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) setFileRatio(v.videoWidth / v.videoHeight);
              }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={'Vidéo ' + (safeIndex + 1)}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {videos.length > 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 18 }}>
            <button type="button" aria-label="Vidéo précédente" onClick={handlePrev} onMouseEnter={hoverOn} onMouseLeave={hoverOff} style={roundBtn}>
              <ArrowIcon dir="left" />
            </button>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: '0.12em', minWidth: 56, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {safeIndex + 1} / {videos.length}
            </span>
            <button type="button" aria-label="Vidéo suivante" onClick={handleNext} onMouseEnter={hoverOn} onMouseLeave={hoverOff} style={roundBtn}>
              <ArrowIcon dir="right" />
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
