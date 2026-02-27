"use client";

import Image from 'next/image';
import React, { useState, useCallback } from 'react';

type Item = { id: string | number; title?: string; image_url: string; width?: number; height?: number; slug?: string };

const EAGER_COUNT = 6;

export default function GalleryGrid({ items }: { items: Item[] }) {
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());

  const markLoaded = useCallback((index: number) => {
    setLoadedSet((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
      {items.map((it, i) => (
        <div key={it.id} style={{ borderRadius: 8, overflow: 'hidden', background: 'transparent' }}>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(it.height || 3) / (it.width || 4) * 100}%` }}>
            <Image
              src={it.image_url}
              alt={it.title || ''}
              fill
              sizes="33vw"
              style={{ objectFit: 'cover', ...(i < EAGER_COUNT ? {} : { opacity: loadedSet.has(i) ? 1 : 0, transition: 'opacity 0.4s ease' }) }}
              loading={i < EAGER_COUNT ? 'eager' : 'lazy'}
              priority={i < 3}
              onLoad={() => markLoaded(i)}
              onLoadingComplete={() => markLoaded(i)}
            />
          </div>
          {it.title && <div style={{ padding: '0.75rem 1rem' }}><h3 style={{ margin: 0, fontSize: '0.95rem' }}>{it.title}</h3></div>}
        </div>
      ))}
    </div>
  );
}
