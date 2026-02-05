"use client";

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { VideoLightboxItem } from './VideoLightbox';
import styles from './VideoGallery.module.css';

const VideoLightbox = dynamic(() => import('./VideoLightbox').then((m) => ({ default: m.default })), { ssr: false });

type VideoItem = { url: string; columns?: 1 | 2 | 3 | 4; cover?: { url: string; path?: string } };
type Props = {
  videos?: Array<string | VideoItem>;
  className?: string;
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

function getThumbnailUrl(id: string, quality: (typeof YOUTUBE_THUMB_QUALITIES)[number] = 'maxresdefault') {
  if (!id) return '';
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

function getNextThumbnailFallback(currentSrc: string, id: string): string {
  if (!id) return '';
  for (let i = 0; i < YOUTUBE_THUMB_QUALITIES.length - 1; i++) {
    if (currentSrc.includes(`/${YOUTUBE_THUMB_QUALITIES[i]}.jpg`)) {
      return getThumbnailUrl(id, YOUTUBE_THUMB_QUALITIES[i + 1]);
    }
  }
  return getThumbnailUrl(id, 'hqdefault');
}

export default function VideoGallery({ videos, className }: Props) {
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
      return { url: String(obj.url || ''), columns, cover: obj.cover };
    });
  }, [raw]);

  const rows: Array<VideoItem | VideoItem[]> = useMemo(() => {
    const out: Array<VideoItem | VideoItem[]> = [];
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      const n = cur.columns || 1;
      if (n > 1) {
        const group: VideoItem[] = [cur];
        let j = i + 1;
        while (group.length < n && j < list.length) {
          if ((list[j].columns || 1) === n) {
            group.push(list[j]);
          } else break;
          j++;
        }
        if (group.length === n) {
          out.push(group);
          i += group.length - 1;
        } else {
          out.push(cur);
        }
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

  let globalIndex = 0;

  return (
    <div className={className ?? ''} style={{ padding: '1.5rem 0' }}>
      {rows.map((r, idx) => {
        if (Array.isArray(r) && r.length > 1) {
          const count = r.length;
          const gap = 12;
          return (
            <div key={idx} style={{ display: 'flex', gap, marginBottom: '2rem' }}>
              {r.map((item, j) => {
                const id = getYouTubeId(item.url);
                const isShort = isYouTubeShort(item.url);
                const paddingTop = isShort ? '177.78%' : '56.25%';
                const thumbUrl = id ? getThumbnailUrl(id) : '';
                const coverSrc = item.cover?.url || thumbUrl;
                const widthPercent = `${100 / count}%`;
                const myIndex = globalIndex++;
                if (!id && !item.cover?.url) return <div key={j} style={{ width: widthPercent }} />;
                return (
                  <div key={j} style={{ width: widthPercent }}>
                    <button
                      type="button"
                      onClick={() => openLightbox(myIndex)}
                      className={styles.cardButton}
                      aria-label="Vidéo galerie"
                      style={{ position: 'relative', paddingTop, display: 'block', width: '100%', border: 'none', cursor: 'pointer', background: '#000', overflow: 'hidden' }}
                    >
                      <img
                        src={coverSrc}
                        alt=""
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          if (!item.cover?.url && id) {
                            const next = getNextThumbnailFallback((e.target as HTMLImageElement).src, id);
                            if (next) (e.target as HTMLImageElement).src = next;
                          }
                        }}
                      />
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
        const count = item.columns || 1;
        const id = getYouTubeId(item.url);
        const isShort = isYouTubeShort(item.url);
        const paddingTop = isShort ? '177.78%' : '56.25%';
        const thumbUrl = id ? getThumbnailUrl(id) : '';
        const coverSrc = item.cover?.url || thumbUrl;
        const myIndex = globalIndex++;

        if (!id && !item.cover?.url) {
          return <div key={idx} style={{ marginBottom: '2rem' }} />;
        }

        if (count > 1) {
          const width = `${100 / count}%`;
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginBottom: '2rem' }}>
              <div style={{ width }}>
                <button
                  type="button"
                  onClick={() => openLightbox(myIndex)}
                  className={styles.cardButton}
                  aria-label="Vidéo galerie"
                  style={{ position: 'relative', paddingTop, display: 'block', width: '100%', border: 'none', cursor: 'pointer', background: '#000', overflow: 'hidden' }}
                >
                  <img
                    src={coverSrc}
                    alt=""
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      if (!item.cover?.url && id) {
                        const next = getNextThumbnailFallback((e.target as HTMLImageElement).src, id);
                        if (next) (e.target as HTMLImageElement).src = next;
                      }
                    }}
                  />
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
            </div>
          );
        }

        return (
          <div key={idx} style={{ marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => openLightbox(myIndex)}
              className={styles.cardButton}
              aria-label="Vidéo galerie"
              style={{ position: 'relative', paddingTop, display: 'block', width: '100%', border: 'none', cursor: 'pointer', background: '#000', overflow: 'hidden' }}
            >
              <img
                src={coverSrc}
                alt=""
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  if (!item.cover?.url && id) {
                    const next = getNextThumbnailFallback((e.target as HTMLImageElement).src, id);
                    if (next) (e.target as HTMLImageElement).src = next;
                  }
                }}
              />
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
