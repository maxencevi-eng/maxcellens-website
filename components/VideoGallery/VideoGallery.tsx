"use client";

import React from 'react';

type VideoItem = { url: string; columns?: 1 | 2 | 3 | 4 };
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
export default function VideoGallery({ videos, className }: Props) {
  const raw = videos ?? [];

  if (raw.length === 0) return null;

  // Normalize items to objects { url, columns }
  const list: VideoItem[] = raw.map((it) => {
    if (!it) return { url: '', columns: 1 };
    if (typeof it === 'string') return { url: it, columns: 1 };
    const obj = it as VideoItem;
    const cols = Number(obj.columns) || 1;
    const columns = cols >= 1 && cols <= 4 ? (cols as 1 | 2 | 3 | 4) : 1;
    return { url: String(obj.url || ''), columns };
  });

  const rows: Array<VideoItem | VideoItem[]> = [];
  for (let i = 0; i < list.length; i++) {
    const cur = list[i];
    const n = cur.columns || 1;
    if (n > 1) {
      // try to form a row of 'n' items where each item requests the same n
      const group: VideoItem[] = [cur];
      let j = i + 1;
      while (group.length < n && j < list.length) {
        if ((list[j].columns || 1) === n) {
          group.push(list[j]);
        } else break;
        j++;
      }
      if (group.length === n) {
        rows.push(group);
        i += group.length - 1; // skip grouped items
      } else {
        // not enough matching items — render current item alone but with fractional width
        rows.push(cur);
      }
    } else {
      rows.push(cur);
    }
  }

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
                const src = `https://www.youtube.com/embed/${id}`;
                const widthPercent = `${100 / count}%`;
                return (
                  <div key={j} style={{ width: widthPercent }}>
                    <div style={{ position: 'relative', paddingTop }}>
                      <iframe
                        src={src}
                        title={`video-${idx}-${j}`}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        const item = (r as VideoItem);
        const count = item.columns || 1;
        const id = getYouTubeId(item.url);
        const isShort = isYouTubeShort(item.url);
        const paddingTop = isShort ? '177.78%' : '56.25%';
        const src = `https://www.youtube.com/embed/${id}`;

        if (count > 1) {
          const width = `${100 / count}%`;
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginBottom: '2rem' }}>
              <div style={{ width }}>{
                <div style={{ position: 'relative', paddingTop }}>
                  <iframe
                    src={src}
                    title={`video-${idx}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              }</div>
            </div>
          );
        }

        return (
          <div key={idx} style={{ marginBottom: '2rem' }}>
            <div style={{ position: 'relative', paddingTop }}>
              <iframe
                src={src}
                title={`video-${idx}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

