"use client";

import React, { useEffect, useState } from 'react';
// use native img to avoid next/image remote domain restrictions in admin editor preview
import PortraitLightbox from '../PortraitLightbox/PortraitLightbox';

type Item = { id: string | number; title?: string; image_url: string; width?: number; height?: number };

type Settings = { galleryType?: string; columns?: number; aspect?: string; disposition?: string };

export default function PortraitGallery({ items, settings = {} }: { items: Item[]; settings?: Settings }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number>(0);
  const [columns, setColumns] = useState<number>(3);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [spans, setSpans] = useState<number[]>([]);

  // set columns from settings (fallback to responsive default)
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      let cols = 3;
      if (settings.columns && Number.isFinite(settings.columns)) cols = Math.max(1, Math.min(6, settings.columns));
      else {
        if (w < 640) cols = 1;
        else if (w < 1024) cols = 2;
        else cols = 3;
      }
      setColumns(cols);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [settings.columns]);

  // compute grid spans so items fill grid rows and keep uniform gaps
  useEffect(() => {
    function compute() {
      if (!gridRef.current) return setSpans([]);
      const gap = 16; // must match gap variable below
      const containerWidth = gridRef.current.clientWidth;
      const colWidth = (containerWidth - gap * (columns - 1)) / columns;
      const rowHeight = 8; // base row height in px (granularity)
      const newSpans = items.map((it) => {
        // if an explicit aspect is set in settings, use that for all items
        if (settings.aspect && settings.aspect !== 'original') {
          const m = settings.aspect.match(/(\d+):(\d+)/);
          if (m) {
            let w = Number(m[1]);
            let h = Number(m[2]);
            // if disposition is 'vertical', invert ratio to make it tall
            if (settings.disposition === 'vertical') {
              const tmp = w; w = h; h = tmp;
            }
            const heightPx = (h / w) * colWidth;
            return Math.max(1, Math.ceil(heightPx / rowHeight));
          }
        }
        const w = it.width || 4;
        const h = it.height || 3;
        const heightPx = (h / w) * colWidth;
        return Math.max(1, Math.ceil(heightPx / rowHeight));
      });
      setSpans(newSpans);
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [items, columns, settings.aspect, settings.disposition]);

  if (!items || items.length === 0) return null;

  function open(i: number) { setOpenIndex(i); }
  function close() { setOpenIndex(null); }
  function prev() { if (openIndex === null) return; setOpenIndex((openIndex + items.length - 1) % items.length); }
  function next() { if (openIndex === null) return; setOpenIndex((openIndex + 1) % items.length); }

  const gap = 16;
  const rowHeight = 8;

  // compute a unified padding percent when a fixed aspect is configured
  const aspectPaddingPercent = React.useMemo(() => {
    try {
      if (settings.aspect && settings.aspect !== 'original') {
        const m = settings.aspect.match(/(\d+):(\d+)/);
        if (m) {
          let w = Number(m[1]);
          let h = Number(m[2]);
          // if disposition is 'vertical', invert ratio to make the container taller
          if (settings.disposition === 'vertical') {
            const tmp = w; w = h; h = tmp;
          }
          return (h / w) * 100;
        }
      }
    } catch (_) {}
    return null;
  }, [settings.aspect, settings.disposition]);

  return (
    <div className="PortraitGallery" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1100, width: '100%' }}>
        {/* Render according to galleryType */}
        {(!settings.galleryType || settings.galleryType === 'masonry') && (
          <div ref={gridRef} style={{ columnCount: columns, columnGap: gap, width: '100%' }}>
            {items.map((it, i) => (
              <div key={`${String(it.id)}-${i}`} style={{ breakInside: 'avoid', marginBottom: 12 }}>
                <button onClick={() => { if (!settings.galleryType || settings.galleryType === 'masonry' || settings.galleryType === 'grid') open(i); }} aria-label={it.title || `image-${i}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                      {aspectPaddingPercent ? (
                        <div style={{ width: '100%', borderRadius: 0, overflow: 'hidden', background: '#f6f7f8', position: 'relative', paddingBottom: `${aspectPaddingPercent}%` }}>
                          <img src={it.image_url} alt={it.title || ''} style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', borderRadius: 0, overflow: 'hidden', background: '#f6f7f8' }}>
                          <img src={it.image_url} alt={it.title || ''} style={{ objectFit: 'cover', width: '100%', display: 'block' }} />
                        </div>
                      )}
                </button>
              </div>
            ))}
          </div>
        )}

        {settings.galleryType === 'grid' && (
          <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap, alignItems: 'start' }}>
            {items.map((it, i) => {
              const m = (settings.aspect || '').match(/(\d+):(\d+)/);
              if (m) {
                let w = Number(m[1]);
                let h = Number(m[2]);
                if (settings.disposition === 'vertical') { const t = w; w = h; h = t; }
                const paddingBottom = (h / w) * 100;
                return (
                  <div key={`${String(it.id)}-${i}`} style={{ display: 'block' }}>
                    <button onClick={() => { if (settings.galleryType === 'grid' || !settings.galleryType || settings.galleryType === 'masonry') open(i); }} aria-label={it.title || `image-${i}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                      <div style={{ width: '100%', borderRadius: 0, overflow: 'hidden', background: '#f6f7f8', position: 'relative', paddingBottom: `${paddingBottom}%` }}>
                        <img src={it.image_url} alt={it.title || ''} style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                      </div>
                    </button>
                  </div>
                );
              }
              return (
                <div key={`${String(it.id)}-${i}`}>
                  <button onClick={() => open(i)} aria-label={it.title || `image-${i}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                    <div style={{ position: 'relative', width: '100%', borderRadius: 0, overflow: 'hidden', background: '#f6f7f8', height: '100%' }}>
                      <img src={it.image_url} alt={it.title || ''} style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {settings.galleryType === 'carousel' && (
          <div style={{ display: 'flex', gap, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8 }}>
            {items.map((it, i) => (
              <div key={`${String(it.id)}-${i}`} style={{ flex: `0 0 ${Math.max(20, Math.floor(100 / Math.max(1, columns)))}%`, scrollSnapAlign: 'center' }}>
                <div aria-label={it.title || `image-${i}`} style={{ all: 'unset', cursor: 'default', display: 'block', width: '100%' }}>
                  <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden', background: '#f6f7f8' }}>
                    <img src={it.image_url} alt={it.title || ''} style={{ objectFit: 'cover', width: '100%', display: 'block' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {settings.galleryType === 'slideshow' && (
          <div style={{ position: 'relative' }}>
            <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden', background: '#f6f7f8' }}>
              <img src={items[slideshowIndex % items.length].image_url} alt={items[slideshowIndex % items.length].title || ''} style={{ objectFit: 'cover', width: '100%', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <button onClick={() => setSlideshowIndex((s) => (s - 1 + items.length) % items.length)}>◀</button>
            </div>
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <button onClick={() => setSlideshowIndex((s) => (s + 1) % items.length)}>▶</button>
            </div>
          </div>
        )}
      </div>

      {openIndex !== null && (
        <PortraitLightbox images={items.map(i => ({ src: i.image_url, title: i.title }))} index={openIndex} onClose={close} onPrev={prev} onNext={next} />
      )}
    </div>
  );
}
