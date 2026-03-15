"use client";

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import type { VideoLightboxItem } from './VideoLightbox';
import styles from './VideoGallery.module.css';

const VideoLightbox = dynamic(() => import('./VideoLightbox').then((m) => ({ default: m.default })), { ssr: false });

export type GallerySettings = {
  paddingVDesktop?: string;
  paddingHDesktop?: string;
  paddingVMobile?: string;
  paddingHMobile?: string;
  gap?: number;
  borderRadius?: number;
  shadow?: 'none' | 'light' | 'medium' | 'heavy';
  glossy?: boolean;
  showTitle?: boolean;
  titleFontSize?: number;
  titleColor?: string;
  titleBg?: string;
  titlePosition?: 'bottom' | 'top' | 'center';
  // Display mode
  displayMode?: 'grid' | 'row';
  // Grid mode settings
  gridColumns?: number;
  tileRatio?: '16:9' | '4:3' | '1:1' | '3:2';
  glassOpacity?: number;
  glassBorder?: boolean;
  glassBlur?: number;
  hoverScale?: number;
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

const YOUTUBE_THUMB_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'] as const;

function getYouTubeThumb(id: string, quality: (typeof YOUTUBE_THUMB_QUALITIES)[number] = 'maxresdefault') {
  if (!id) return '';
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

function getNextThumbFallback(currentSrc: string, id: string): string {
  if (!id) return '';
  for (let i = 0; i < YOUTUBE_THUMB_QUALITIES.length - 1; i++) {
    if (currentSrc.includes(`/${YOUTUBE_THUMB_QUALITIES[i]}.jpg`))
      return getYouTubeThumb(id, YOUTUBE_THUMB_QUALITIES[i + 1]);
  }
  return getInlineThumb('Vidéo YouTube');
}

function getInlineThumb(label: string) {
  const safeLabel = label || 'Vidéo';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='270' role='img' aria-label='${safeLabel}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23000000'/><stop offset='100%' stop-color='%23111111'/></linearGradient></defs><rect fill='url(%23g)' width='100%' height='100%'/><circle cx='50%' cy='50%' r='38' fill='rgba(0,0,0,0.55)'/><polygon points='210,135 210,115 240,135 210,155' fill='%23f5f5f5'/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  light: '0 2px 12px rgba(0,0,0,0.18)',
  medium: '0 6px 24px rgba(0,0,0,0.28)',
  heavy: '0 12px 40px rgba(0,0,0,0.45)',
};

// Tile aspect ratios for grid mode (CSS aspect-ratio values)
const TILE_RATIO_CSS: Record<string, string> = {
  '16:9': '16/9',
  '4:3':  '4/3',
  '1:1':  '1/1',
  '3:2':  '3/2',
};

export default function VideoGallery({ videos, className, gallerySettings }: Props) {
  const gs = gallerySettings || {};
  const raw = videos ?? [];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());

  const markLoaded = useCallback((index: number) => {
    setLoadedSet((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

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

  // Row mode: group consecutive same-column videos into rows
  const rows: Array<VideoItem | VideoItem[]> = useMemo(() => {
    const out: Array<VideoItem | VideoItem[]> = [];
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      const n = cur.columns || 1;
      if (n > 1) {
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
    return list.map((item) => ({ url: item.url, isShort: isYouTubeShort(item.url) }));
  }, [list]);

  const openLightbox = (index: number) => {
    setLightboxInitialIndex(index);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const goPrev = () => setLightboxIndex((i) => (i <= 0 ? flatList.length - 1 : i - 1));
  const goNext = () => setLightboxIndex((i) => (i >= flatList.length - 1 ? 0 : i + 1));

  if (raw.length === 0) return null;

  // Settings
  const displayMode = gs.displayMode ?? 'grid';
  const gap = gs.gap ?? 12;
  const borderRadius = gs.borderRadius ?? 12;
  const shadowVal = SHADOW_PRESETS[gs.shadow || 'medium'] || SHADOW_PRESETS.medium;
  const glossy = gs.glossy ?? false;
  const showTitle = gs.showTitle ?? false;
  const titleFontSize = gs.titleFontSize ?? 14;
  const titleColor = gs.titleColor || '#ffffff';
  const titleBg = gs.titleBg || 'rgba(0,0,0,0.6)';
  const titlePosition = gs.titlePosition || 'bottom';
  // Grid-specific
  const gridColumns = gs.gridColumns ?? 3;
  const tileRatioCss = TILE_RATIO_CSS[gs.tileRatio || '16:9'] || '16/9';
  const glassOpacity = gs.glassOpacity ?? 0.12;
  const glassBorder = gs.glassBorder ?? true;
  const glassBlur = gs.glassBlur ?? 10;
  const hoverScale = gs.hoverScale ?? 1.03;

  const pVD = gs.paddingVDesktop || '1.5rem';
  const pHD = gs.paddingHDesktop || '0';
  const desktopPadding = `${pVD} ${pHD}`;
  const pVM = gs.paddingVMobile;
  const pHM = gs.paddingHMobile;
  const hasMobilePadding = pVM !== undefined || pHM !== undefined;
  const mobilePadding = hasMobilePadding ? `${pVM || pVD} ${pHM || pHD}` : undefined;

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
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        {title}
      </span>
    );
  }

  // Shared overlays (depth, glossy, border, play)
  function renderCardOverlays(title?: string) {
    return (
      <>
        <span className={styles.glassDepthOverlay} aria-hidden />
        {glossy && <span className={styles.glossyOverlay} aria-hidden />}
        {glassBorder && (
          <span
            className={styles.glassBorderOverlay}
            style={{ borderRadius: borderRadius > 0 ? borderRadius : undefined }}
            aria-hidden
          />
        )}
        {renderTitleOverlay(title)}
        <span aria-hidden className={styles.playOverlay}>
          <span className={styles.playIcon} />
        </span>
      </>
    );
  }

  const glassCardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: borderRadius > 0 ? borderRadius : undefined,
    boxShadow: shadowVal !== 'none' ? shadowVal : undefined,
    background: `rgba(255,255,255,${glassOpacity})`,
    backdropFilter: `blur(${glassBlur}px)`,
    WebkitBackdropFilter: `blur(${glassBlur}px)`,
    ...extra,
  });

  const imgStyle = (i: number, isLoaded: boolean): React.CSSProperties => ({
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
    ...(i < 4 ? {} : { opacity: isLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }),
  });

  // ── GRID MODE ──────────────────────────────────────────────────
  if (displayMode === 'grid') {
    return (
      <div
        className={`${className ?? ''} ${styles.galleryResponsive}`}
        style={{
          padding: desktopPadding,
          '--gallery-padding-mobile': mobilePadding || undefined,
        } as React.CSSProperties}
        data-padding-mobile={hasMobilePadding ? '' : undefined}
      >
        <div
          className={styles.glassGrid}
          style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)`, gap: `${gap}px` }}
        >
          {list.map((item, i) => {
            if (!item.url && !item.cover?.url) return null;
            // columns: N = "N vidéos par ligne" (cohérent avec le mode row)
            // → span = gridColumns / columns (arrondi, min 1)
            const span = Math.max(1, Math.floor(gridColumns / (item.columns || 1)));
            const id = getYouTubeId(item.url);
            const isShort = isYouTubeShort(item.url);
            const coverSrc = item.cover?.url || (id ? getYouTubeThumb(id) : getInlineThumb('Vidéo'));
            const isLoaded = loadedSet.has(i);
            // For portrait videos, focus on top (faces) rather than center
            const objPosition = isShort ? 'center top' : 'center center';

            return (
              <motion.div
                key={i}
                className={styles.glassTile}
                style={{ gridColumn: `span ${span}` }}
                whileHover={{ scale: hoverScale }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(i)}
                  className={styles.glassCard}
                  aria-label={item.title || `Vidéo ${i + 1}`}
                  data-video-name={item.title || `Vidéo ${i + 1}`}
                  style={glassCardStyle()}
                >
                  {/* Fixed-ratio inner — crops vertical videos gracefully */}
                  <div
                    className={styles.glassTileInner}
                    style={{ '--tile-ratio': tileRatioCss } as React.CSSProperties}
                  >
                    <img
                      ref={(el) => { if (el && el.complete && el.naturalWidth > 0) markLoaded(i); }}
                      src={coverSrc}
                      alt=""
                      loading={i < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      onLoad={() => markLoaded(i)}
                      className={styles.glassCardImg}
                      style={{ ...imgStyle(i, isLoaded), objectPosition: objPosition }}
                      onError={(e) => {
                        if (!item.cover?.url) {
                          const img = e.currentTarget as HTMLImageElement;
                          const next = getNextThumbFallback(img.src || '', id);
                          img.src = next;
                          if (next.startsWith('data:')) img.onerror = null;
                        }
                      }}
                    />
                    {renderCardOverlays(item.title)}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

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

  // ── ROW MODE ──────────────────────────────────────────────────
  let globalIndex = 0;

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
            <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', gap, marginBottom: gap }}>
              {r.map((item, j) => {
                const id = getYouTubeId(item.url);
                const isShort = isYouTubeShort(item.url);
                const paddingTop = isShort ? '177.78%' : '56.25%';
                const coverSrc = item.cover?.url || (id ? getYouTubeThumb(id) : getInlineThumb('Vidéo'));
                const myIndex = globalIndex++;
                const isLoaded = loadedSet.has(myIndex);
                if (!item.url && !item.cover?.url) return <div key={j} style={{ width: itemWidth }} />;
                return (
                  <div key={j} style={{ width: itemWidth }}>
                    <motion.div
                      whileHover={{ scale: hoverScale }}
                      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                    >
                      <button
                        type="button"
                        onClick={() => openLightbox(myIndex)}
                        className={styles.glassCard}
                        aria-label={item.title || `Vidéo ${myIndex + 1}`}
                        data-video-name={item.title || `Vidéo ${myIndex + 1}`}
                        style={glassCardStyle()}
                      >
                        <div style={{ position: 'relative', paddingTop, overflow: 'hidden', borderRadius: 'inherit' }}>
                          <img
                            ref={(el) => { if (el && el.complete && el.naturalWidth > 0) markLoaded(myIndex); }}
                            src={coverSrc}
                            alt=""
                            loading={myIndex < 4 ? 'eager' : 'lazy'}
                            decoding="async"
                            onLoad={() => markLoaded(myIndex)}
                            className={styles.glassCardImg}
                            style={imgStyle(myIndex, isLoaded)}
                            onError={(e) => {
                              if (!item.cover?.url) {
                                const img = e.currentTarget as HTMLImageElement;
                                const next = getNextThumbFallback(img.src || '', id);
                                img.src = next;
                                if (next.startsWith('data:')) img.onerror = null;
                              }
                            }}
                          />
                          {renderCardOverlays(item.title)}
                        </div>
                      </button>
                    </motion.div>
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
        const coverSrc = item.cover?.url || (id ? getYouTubeThumb(id) : getInlineThumb('Vidéo'));
        const myIndex = globalIndex++;
        const isLoaded = loadedSet.has(myIndex);

        if (!item.url && !item.cover?.url) return <div key={idx} style={{ marginBottom: gap }} />;

        return (
          <div key={idx} style={{ marginBottom: gap }}>
            <motion.div
              whileHover={{ scale: hoverScale }}
              transition={{ type: 'spring', stiffness: 340, damping: 22 }}
            >
              <button
                type="button"
                onClick={() => openLightbox(myIndex)}
                className={styles.glassCard}
                aria-label={item.title || `Vidéo ${myIndex + 1}`}
                data-video-name={item.title || `Vidéo ${myIndex + 1}`}
                style={glassCardStyle()}
              >
                <div style={{ position: 'relative', paddingTop, overflow: 'hidden', borderRadius: 'inherit' }}>
                  <img
                    ref={(el) => { if (el && el.complete && el.naturalWidth > 0) markLoaded(myIndex); }}
                    src={coverSrc}
                    alt=""
                    loading={myIndex < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={() => markLoaded(myIndex)}
                    className={styles.glassCardImg}
                    style={imgStyle(myIndex, isLoaded)}
                    onError={(e) => {
                      if (!item.cover?.url) {
                        const img = e.currentTarget as HTMLImageElement;
                        const next = getNextThumbFallback(img.src || '', id);
                        img.src = next;
                        if (next.startsWith('data:')) img.onerror = null;
                      }
                    }}
                  />
                  {renderCardOverlays(item.title)}
                </div>
              </button>
            </motion.div>
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
