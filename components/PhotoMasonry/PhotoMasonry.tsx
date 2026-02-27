'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import React, { useState, useCallback } from 'react';
import type { Project } from '../../types';

const EAGER_COUNT = 6;

export default function PhotoMasonry({ items }: { items: Project[] }) {
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());

  const markLoaded = useCallback((index: number) => {
    setLoadedSet((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  return (
    <div className="photo-gallery columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
      {items.map((item, i) => (
        <motion.article
          key={item.id}
          className="masonry-item rounded overflow-hidden"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.99 }}
        >
          <Link href={`/projects/${item.slug}`} aria-label={item.title} data-analytics-id={`Projet|${(item.title || item.slug || '').toString().slice(0, 50)}`}>
            <div className="relative w-full" style={{ paddingBottom: `${(item.height || 3) / (item.width || 4) * 100}%` }}>
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                loading={i < EAGER_COUNT ? 'eager' : 'lazy'}
                priority={i < 3}
                onLoad={() => markLoaded(i)}
                onLoadingComplete={() => markLoaded(i)}
                style={i < EAGER_COUNT ? {} : { opacity: loadedSet.has(i) ? 1 : 0, transition: 'opacity 0.4s ease' }}
              />
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium">{item.title}</h3>
            </div>
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
