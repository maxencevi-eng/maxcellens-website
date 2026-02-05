"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion } from 'framer-motion';

const Lightbox = dynamic(() => import('../Lightbox/Lightbox'), { ssr: false });

type Item = { id: string | number; title?: string; image_url: string; width?: number; height?: number };

export default function GalleryMasonry({ items }: { items: Item[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const images = items.map((it) => ({ src: it.image_url, title: it.title }));

  function open(i: number) { setOpenIndex(i); }
  function close() { setOpenIndex(null); }
  function prev() { if (openIndex === null) return; setOpenIndex((openIndex + images.length - 1) % images.length); }
  function next() { if (openIndex === null) return; setOpenIndex((openIndex + 1) % images.length); }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 1100, width: '100%', background: 'var(--card-bg, #fff)', padding: 20, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
        <div className="columns-3" style={{ columnGap: '1rem' }}>
        {items.map((item, i) => (
          <motion.article key={item.id} className="masonry-item rounded overflow-hidden bg-slate-100" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.995 }} style={{ breakInside: 'avoid', display: 'inline-block', width: '100%' }}>
            <button onClick={() => open(i)} style={{ all: 'unset', cursor: 'pointer', display: 'block' }} aria-label={item.title || `image-${i}`}>
              <div className="relative w-full" style={{ paddingBottom: `${(item.height || 3) / (item.width || 4) * 100}%` }}>
                <Image src={item.image_url} alt={item.title || ''} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
              </div>
              <div className="p-3">
                {item.title && <h3 className="text-sm font-medium">{item.title}</h3>}
              </div>
            </button>
          </motion.article>
        ))}
        </div>
      </div>
      {openIndex !== null && (
        <Lightbox images={images} index={openIndex} onClose={close} onPrev={prev} onNext={next} />
      )}
    </div>
  );
}
