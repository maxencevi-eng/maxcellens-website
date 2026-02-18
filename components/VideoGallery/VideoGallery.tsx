"use client";

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { VideoLightboxItem } from './VideoLightbox';
import styles from './VideoGallery.module.css';

const VideoLightbox = dynamic(() => import('./VideoLightbox').then((m) => ({ default: m.default })), { ssr: false });

export type GallerySettings = {
  /** @deprecated Use paddingVDesktop/paddingHDesktop instead */
  paddingDesktop?: string;
  /** @deprecated Use paddingVMobile/paddingHMobile instead */
  paddingMobile?: string;
  paddingVDesktop?: number;
  paddingHDesktop?: number;
  paddingVMobile?: number;
  paddingHMobile?: number;
  gap?: number;
  borderRadius?: number;
  shadow?: 'none' | 'light' | 'medium' | 'heavy';
  glossy?: boolean;
  showTitle?: boolean;
  titleFontSize?: number;
  titleColor?: string;
  titleBg?: string;
  titlePosition?: 'bottom' | 'top' | 'center';
};

type VideoItem = { url: string; columns?: 1 | 2 | 3 | 4; cover?: { url: string; path?: string }; title?: string };
type Props = {
  videos?: Array<string | VideoItem>;
  className?: string;
  gallerySettings?: GallerySettings;
};

function getYouTubeId(url: string) {
  try {
    if (!url) return '';
    if (!url.includes('youtube') && !url.includes('youtu.be')) return url;
    const u = url;
    const short = u.match(/youtu\.be\/(.+)$/);
    if (short && short[1]) return short[1].split(/[?&]/)[0];
    const shorts = u.match(/shorts\/([^?&#\/]+)/);
    if (shorts && shorts[1]) return shorts[1].split(/[?&]/)[0];
    const embed = u.match(/embed\/(.+)$/);
    if (embed && embed[1]) return embed[1].split(/[?&]/)[0];
    const watch = u.match(/[?&]v=([^&]+)/);
    if (watch && watch[1]) return watch[1];
    return u;
  } catch (e) {
    return url;
  }
}

function isYouTubeShort(url: string) {
  try {
    if (!url) return false;
    return /\/shorts\//.test(url);
  } catch (_) {
    return false;
  }
}

/** Miniature YouTube simple (hqdefault) + fallback inline en cas d’erreur */
const YOUTUBE_THUMB_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'] as const;

function getYouTubeThumb(id: string, quality: (typeof YOUTUBE_THUMB_QUALITIES)[number] = 'maxresdefault') {
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

function getNextThumbFallback(currentSrc: string, id: string): string {
  if (!id) return "";
  for (let i = 0; i < YOUTUBE_THUMB_QUALITIES.length - 1; i++) {
    if (currentSrc.includes(`/${YOUTUBE_THUMB_QUALITIES[i]}.jpg`))
      return getYouTubeThumb(id, YOUTUBE_THUMB_QUALITIES[i + 1]);
  }
  return getInlineThumb("Vidéo YouTube");
}

function getInlineThumb(label: string) {
  const safeLabel = label || "Vidéo";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='270' role='img' aria-label='${safeLabel}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23000000'/><stop offset='100%' stop-color='%23111111'/></linearGradient></defs><rect fill='url(%23g)' width='100%' height='100%'/><circle cx='50%' cy='50%' r='38' fill='rgba(0,0,0,0.55)'/><polygon points='210,135 210,115 240,135 210,155' fill='%23f5f5f5'/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  light: '0 2px 8px rgba(0,0,0,0.15)',
  medium: '0 4px 16px rgba(0,0,0,0.25)',
  heavy: '0 8px 30px rgba(0,0,0,0.4)',
};

export default function VideoGallery({ videos, className, gallerySettings }: Props) {
  const gs = gallerySettings || {};
  const raw = videos ?? [];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  const list: VideoItem[] = useMemo(() => {
    return raw.map((it) => {
      if (!it) return { url: '', columns: 1 };
      if (typeof it === 'string') return { url: it, columns: 1 };
      const obj = it as VideoItem;
      const cols = Number(obj.columns) || 1;
      const columns = cols >= 1 && cols <= 4 ? (cols as 1 | 2 | 3 | 4) : 1;
      return { url: String(obj.url || ''), columns, cover: obj.cover, title: obj.title };
    });
  }, [raw]);

  const rows: Array<VideoItem | VideoItem[]> = useMemo(() => {
    const out: Array<VideoItem | VideoItem[]> = [];
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      const n = cur.columns || 1;
      if (n > 1) {
        // Group ALL consecutive videos with the same columns value
        const group: VideoItem[] = [cur];
        while (i + 1 < list.length && (list[i + 1].columns || 1) === n) {
          i++;
          group.push(list[i]);
        }
        out.push(group);
      } else {
        out.push(cur);
      }
    }
    return out;
  }, [list]);

  const flatList: VideoLightboxItem[] = useMemo(() => {
    const out: VideoLightboxItem[] = [];
    for (const r of rows) {
      if (Array.isArray(r)) {
        for (const item of r) {
          out.push({ url: item.url, isShort: isYouTubeShort(item.url) });
        }
      } else {
        out.push({ url: (r as VideoItem).url, isShort: isYouTubeShort((r as VideoItem).url) });
      }
    }
    return out;
  }, [rows]);

  const openLightbox = (index: number) => {
    setLightboxInitialIndex(index);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const goPrev = () => setLightboxIndex((i) => (i <= 0 ? flatList.length - 1 : i - 1));
  const goNext = () => setLightboxIndex((i) => (i >= flatList.length - 1 ? 0 : i + 1));

  if (raw.length === 0) return null;

  const gap = gs.gap ?? 12;
  const borderRadius = gs.borderRadius ?? 0;
  const shadowVal = SHADOW_PRESETS[gs.shadow || 'none'] || 'none';
  const glossy = gs.glossy ?? false;
  const showTitle = gs.showTitle ?? false;
  const titleFontSize = gs.titleFontSize ?? 14;
  const titleColor = gs.titleColor || '#ffffff';
  const titleBg = gs.titleBg || 'rgba(0,0,0,0.6)';
  const titlePosition = gs.titlePosition || 'bottom';

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    background: '#000',
    overflow: 'hidden',
    borderRadius: borderRadius > 0 ? borderRadius : undefined,
    boxShadow: shadowVal !== 'none' ? shadowVal : undefined,
  };

  const titlePositionStyle: React.CSSProperties =
    titlePosition === 'top'
      ? { top: 0, left: 0, right: 0 }
      : titlePosition === 'center'
        ? { top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' }
        : { bottom: 0, left: 0, right: 0 };

  function renderTitleOverlay(title?: string) {
    if (!showTitle || !title) return null;
    return (
      <span
        className={styles.titleOverlay}
        style={{
          position: 'absolute',
          ...titlePositionStyle,
          padding: '6px 10px',
          fontSize: titleFontSize,
          color: titleColor,
          background: titleBg,
          textAlign: 'center',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {title}
      </span>
    );
  }

  function renderGlossyOverlay() {
    if (!glossy) return null;
    return <span className={styles.glossyOverlay} />;
  }

  let globalIndex = 0;

  // Build padding values: prefer numeric fields, fall back to legacy string fields
  const pVD = gs.paddingVDesktop ?? 24;
  const pHD = gs.paddingHDesktop ?? 0;
  const pVM = gs.paddingVMobile;
  const pHM = gs.paddingHMobile;
  const desktopPadding = gs.paddingDesktop || `${pVD}px ${pHD}px`;
  const hasMobilePadding = pVM !== undefined || pHM !== undefined || !!gs.paddingMobile;
  const mobilePadding = gs.paddingMobile || (hasMobilePadding ? `${pVM ?? pVD}px ${pHM ?? pHD}px` : undefined);

  return (
    <div
      className={`${className ?? ''} ${styles.galleryResponsive}`}
      style={{
        padding: desktopPadding,
        '--gallery-padding-mobile': mobilePadding || undefined,
      } as React.CSSProperties}
      data-padding-mobile={hasMobilePadding ? '' : undefined}
    >
      {rows.map((r, idx) => {
        if (Array.isArray(r)) {
          const colCount = r[0].columns || 2;
          const itemWidth = `calc(${100 / colCount}% - ${gap * (colCount - 1) / colCount}px)`;
          return (
            <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', gap, marginBottom: '2rem', justifyContent: 'center' }}>
              {r.map((item, j) => {
                const id = getYouTubeId(item.url);
                const isShort = isYouTubeShort(item.url);
                const paddingTop = isShort ? '177.78%' : '56.25%';
                const coverSrc = item.cover?.url || (id ? getYouTubeThumb(id) : getInlineThumb("Vidéo"));
                const myIndex = globalIndex++;
                if (!item.url && !item.cover?.url) return <div key={j} style={{ width: itemWidth }} />;
                return (
                  <div key={j} style={{ width: itemWidth }}>
                    <button
                      type="button"
                      onClick={() => openLightbox(myIndex)}
                      className={styles.cardButton}
                      aria-label="Vidéo galerie"
                      style={{ ...cardStyle, paddingTop }}
                    >
                      <img
                        src={coverSrc}
                        alt=""
                        loading="lazy"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          if (!item.cover?.url) {
                            const img = e.currentTarget as HTMLImageElement;
                            const next = getNextThumbFallback(img.src || '', id);
                            img.src = next;
                            if (next.startsWith('data:')) img.onerror = null;
                          }
                        }}
                      />
                      {renderGlossyOverlay()}
                      {renderTitleOverlay(item.title)}
                      <span
                        aria-hidden
                        className={styles.playOverlay}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        <span className={styles.playIcon} />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        }

        const item = r as VideoItem;
        const id = getYouTubeId(item.url);
        const isShort = isYouTubeShort(item.url);
        const paddingTop = isShort ? '177.78%' : '56.25%';
        const coverSrc = item.cover?.url || (id ? getYouTubeThumb(id) : getInlineThumb("Vidéo"));
        const myIndex = globalIndex++;

        if (!item.url && !item.cover?.url) {
          return <div key={idx} style={{ marginBottom: '2rem' }} />;
        }

        return (
          <div key={idx} style={{ marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => openLightbox(myIndex)}
              className={styles.cardButton}
              aria-label="Vidéo galerie"
              style={{ ...cardStyle, paddingTop }}
            >
              <img
                src={coverSrc}
                alt=""
                loading="lazy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  if (!item.cover?.url) {
                    const img = e.currentTarget as HTMLImageElement;
                    const next = getNextThumbFallback(img.src || '', id);
                    img.src = next;
                    if (next.startsWith('data:')) img.onerror = null;
                  }
                }}
              />
              {renderGlossyOverlay()}
              {renderTitleOverlay(item.title)}
              <span
                aria-hidden
                className={styles.playOverlay}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <span className={styles.playIcon} />
              </span>
            </button>
          </div>
        );
      })}

      {lightboxOpen && flatList.length > 0 && (
        <VideoLightbox
          videos={flatList}
          index={lightboxIndex}
          initialIndex={lightboxInitialIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}
