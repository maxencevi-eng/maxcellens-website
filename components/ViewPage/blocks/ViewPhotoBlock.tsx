"use client";
import React, { useState, useEffect, useRef } from 'react';
import type { ViewBlock } from '../types';
import styles from './blocks.module.css';

export default function ViewPhotoBlock({ block }: { block: ViewBlock }) {
  const photos = block.photos || [];
  const [current, setCurrent] = useState(0);

  // Use a ref so the interval callback always reads the latest photos.length
  // without needing to be recreated (prevents stale-closure stops on re-render)
  const photosLenRef = useRef(photos.length);
  photosLenRef.current = photos.length;

  useEffect(() => {
    if (!block.photoInterval || block.photoInterval <= 0 || photos.length <= 1) return;
    const id = setInterval(
      () => setCurrent((c) => (c + 1) % photosLenRef.current),
      block.photoInterval * 1000,
    );
    return () => clearInterval(id);
  // Only restart the interval if interval duration or photo count changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.photoInterval, photos.length]);

  if (!photos.length) {
    return (
      <div className={styles.photoEmpty}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={32} height={32}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>
        <span>Photo</span>
      </div>
    );
  }

  return (
    <div
      className={styles.photoBlock}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {photos.map((photo, i) => (
        <img
          key={photo.url}
          src={photo.url}
          alt=""
          draggable={false}
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
    </div>
  );
}
