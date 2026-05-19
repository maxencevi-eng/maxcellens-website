"use client";
import React, { useState, useEffect } from 'react';
import type { ViewBlock } from '../types';
import styles from './blocks.module.css';

export default function ViewPhotoBlock({ block }: { block: ViewBlock }) {
  const photos = block.photos || [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!block.photoInterval || block.photoInterval <= 0 || photos.length <= 1) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % photos.length), block.photoInterval * 1000);
    return () => clearInterval(id);
  }, [block.photoInterval, photos.length]);

  if (!photos.length) {
    return (
      <div className={styles.photoEmpty}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={32} height={32}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>
        <span>Photo</span>
      </div>
    );
  }

  const hasMultiple = photos.length > 1;

  return (
    <div className={styles.photoBlock}>
      {photos.map((photo, i) => (
        <img
          key={photo.url}
          src={photo.url}
          alt=""
          className={styles.photoImg}
          style={{
            objectPosition: photo.focus ? `${photo.focus.x}% ${photo.focus.y}%` : 'center center',
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.4s ease',
            position: 'absolute',
            inset: 0,
          }}
        />
      ))}
      {hasMultiple && !block.hideCounter && (
        <div className={styles.photoNav}>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + photos.length) % photos.length); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Précédent"
          >‹</button>
          <span>{current + 1} / {photos.length}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % photos.length); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Suivant"
          >›</button>
        </div>
      )}
    </div>
  );
}
