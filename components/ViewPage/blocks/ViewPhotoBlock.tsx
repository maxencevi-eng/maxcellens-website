"use client";
import React, { useState, useEffect, useRef } from 'react';
import type { ViewBlock } from '../types';
import styles from './blocks.module.css';

export default function ViewPhotoBlock({ block }: { block: ViewBlock }) {
  const photos = block.photos || [];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Refs so the interval closure always reads live values without being recreated
  const blockRef = useRef(block);
  blockRef.current = block;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const divRef = useRef<HTMLDivElement>(null);

  // Single interval created on mount — checks pausedRef each tick, never reset by re-renders
  useEffect(() => {
    const interval = blockRef.current.photoInterval;
    const len = (blockRef.current.photos || []).length;
    if (!interval || interval <= 0 || len <= 1) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const currentLen = (blockRef.current.photos || []).length;
      if (currentLen > 1) setCurrent((c) => (c + 1) % currentLen);
    }, interval * 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click outside the block → resume
  useEffect(() => {
    if (!paused) return;
    function handleOutside(e: PointerEvent) {
      if (divRef.current && !divRef.current.contains(e.target as Node)) {
        setPaused(false);
      }
    }
    document.addEventListener('pointerdown', handleOutside, true);
    return () => document.removeEventListener('pointerdown', handleOutside, true);
  }, [paused]);

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
      ref={divRef}
      className={styles.photoBlock}
      onClick={() => { if (photos.length > 1) setPaused(true); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ cursor: photos.length > 1 ? 'pointer' : 'default' }}
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
      {paused && photos.length > 1 && (
        <div className={styles.photoPausedHint}>⏸</div>
      )}
    </div>
  );
}
