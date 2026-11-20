'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchLinkedInMedia, getLinkedInEmbedUrl, isLinkedInUrl, type LinkedInMedia } from '../../lib/linkedinEmbed';

export type VideoLightboxItem = {
  url: string;
  embedUrl?: string;
  isShort?: boolean;
  kind?: 'youtube' | 'file' | 'linkedin';
  poster?: string;
  /** Plateforme d'origine, affichée sous la vidéo avec un lien vers la publication */
  source?: { platform: 'linkedin'; url: string };
};

const LinkedInLogo = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <rect width="24" height="24" rx="4" fill="#0A66C2" />
    <path fill="#fff" d="M7.1 9.6h-2.6V19h2.6V9.6zM5.8 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM19.5 13.7c0-2.6-1.4-4.3-3.7-4.3-1.3 0-2.2.7-2.6 1.4V9.6h-2.5V19h2.6v-4.9c0-1.3.6-2.2 1.7-2.2 1.1 0 1.6.8 1.6 2.2V19h2.6l.3-5.3z" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

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
  const rawItem = videos[safeIndex];

  // Publications LinkedIn : la lightbox récupère elle-même le MP4 et la couverture,
  // pour que toutes les galeries du site les lisent sans code supplémentaire.
  const linkedInUrl = rawItem && rawItem.kind !== 'file' && (rawItem.kind === 'linkedin' || isLinkedInUrl(rawItem.url)) ? rawItem.url : null;
  const [linkedIn, setLinkedIn] = useState<Record<string, LinkedInMedia | null>>({});
  useEffect(() => {
    if (!linkedInUrl || linkedInUrl in linkedIn) return;
    let alive = true;
    fetchLinkedInMedia(linkedInUrl).then((m) => { if (alive) setLinkedIn((prev) => ({ ...prev, [linkedInUrl]: m })); });
    return () => { alive = false; };
  }, [linkedInUrl, linkedIn]);
  const linkedInPending = !!linkedInUrl && !(linkedInUrl in linkedIn);
  const media = linkedInUrl ? linkedIn[linkedInUrl] : null;

  const item: VideoLightboxItem | undefined = !rawItem || !linkedInUrl ? rawItem : {
    ...rawItem,
    ...(media?.src
      ? { url: media.src, kind: 'file' as const }
      : { kind: 'linkedin' as const, embedUrl: media?.embedUrl || getLinkedInEmbedUrl(linkedInUrl) || undefined }),
    poster: rawItem.poster || media?.poster || undefined,
    source: { platform: 'linkedin', url: media?.postUrl || rawItem.source?.url || linkedInUrl },
  };
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
  }, [item?.url, item?.kind, canAutoplay, linkedInPending]);

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
    ? item.embedUrl || 'about:blank'
    : `${embedBase}${sep}${canAutoplay ? 'autoplay=1&' : ''}playsinline=1&rel=0&modestbranding=1`;

  const ratio = isFile ? fileRatio : isShort ? 9 / 16 : 16 / 9;
  // La vidéo tient toujours dans l'écran, en largeur comme en hauteur
  const frameWidth = `min(94vw, calc(${item.source ? 72 : 78}vh * ${ratio}))`;
  const frameStyle: React.CSSProperties = {
    position: 'relative',
    width: frameWidth,
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
          {linkedInPending ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.poster ? <img src={item.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} /> : null}
              <span
                aria-label="Chargement"
                style={{ position: 'relative', width: 42, height: 42, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'vlbSpin 0.8s linear infinite' }}
              />
              <style>{'@keyframes vlbSpin{to{transform:rotate(360deg)}}'}</style>
            </div>
          ) : isFile ? (
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

        {item.source?.platform === 'linkedin' ? (
          <div
            style={{
              width: frameWidth,
              minWidth: 'min(94vw, 300px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 12,
              padding: '0 2px',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              <LinkedInLogo />
              Publiée sur LinkedIn
            </span>
            <a
              href={item.source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => videoRef.current?.pause()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                background: '#0A66C2',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#004182'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0A66C2'; }}
            >
              Voir sur LinkedIn
              <ExternalIcon />
            </a>
          </div>
        ) : null}

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
