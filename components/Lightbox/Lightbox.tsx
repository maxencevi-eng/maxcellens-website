"use client";

import React, { useEffect } from 'react';

type Props = {
  images: { src: string; title?: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Lightbox({ images, index, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const img = images[index];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <button aria-label="Prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#fff', fontSize: 36, cursor: 'pointer' }}>&larr;</button>
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
        <img src={img.src} alt={img.title || ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
      <button aria-label="Next" onClick={(e) => { e.stopPropagation(); onNext(); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#fff', fontSize: 36, cursor: 'pointer' }}>&rarr;</button>
      <button aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'absolute', right: 20, top: 20, background: 'transparent', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer' }}>✕</button>
    </div>
  );
}
