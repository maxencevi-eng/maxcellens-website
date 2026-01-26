'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import React from 'react';
import type { Project } from '../../types';

export default function PhotoMasonry({ items }: { items: Project[] }) {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
      {items.map((item) => (
        <motion.article
          key={item.id}
          className="masonry-item rounded overflow-hidden bg-slate-100"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.99 }}
        >
          <Link href={`/projects/${item.slug}`} aria-label={item.title}>
            <div className="relative w-full" style={{ paddingBottom: `${(item.height || 3) / (item.width || 4) * 100}%` }}>
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
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
