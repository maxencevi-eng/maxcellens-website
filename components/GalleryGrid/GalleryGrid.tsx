"use client";

import Image from 'next/image';
import React from 'react';

type Item = { id: string | number; title?: string; image_url: string; width?: number; height?: number; slug?: string };

export default function GalleryGrid({ items }: { items: Item[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
      {items.map((it) => (
        <div key={it.id} style={{ borderRadius: 8, overflow: 'hidden', background: '#f8fafb' }}>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(it.height || 3) / (it.width || 4) * 100}%` }}>
            <Image src={it.image_url} alt={it.title || ''} fill sizes="33vw" style={{ objectFit: 'cover' }} />
          </div>
          {it.title && <div style={{ padding: '0.75rem 1rem' }}><h3 style={{ margin: 0, fontSize: '0.95rem' }}>{it.title}</h3></div>}
        </div>
      ))}
    </div>
  );
}
