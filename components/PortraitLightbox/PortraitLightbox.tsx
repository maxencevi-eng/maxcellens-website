"use client";

import React, { useEffect } from 'react';

type Props = {
  images: { src: string; title?: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function PortraitLightbox({ images, index, onClose, onPrev, onNext }: Props) {
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
  const touch = React.useRef({ startX: 0, startY: 0, lastX: 0, moved: false });

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current.startX = t.clientX;
    touch.current.startY = t.clientY;
    touch.current.lastX = t.clientX;
    touch.current.moved = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const t = e.touches[0];
    const dx = t.clientX - touch.current.startX;
    const dy = t.clientY - touch.current.startY;
    touch.current.lastX = t.clientX;
    // mark moved only when horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) touch.current.moved = true;
  }

  function handleTouchEnd() {
    if (!touch.current.moved) return;
    const dx = touch.current.lastX - touch.current.startX;
    // threshold
    if (dx > 50) onPrev();
    else if (dx < -50) onNext();
    // reset
    touch.current.moved = false;
  }

  function wrapperClick(e: React.MouseEvent) {
    // if a swipe gesture just happened, don't treat this as a close tap
    if (touch.current.moved) {
      e.stopPropagation();
      touch.current.moved = false;
      return;
    }
    onClose();
  }

  return (
    <div onClick={wrapperClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10vh 10vw', boxSizing: 'border-box' }}>
      <button aria-label="Prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#fff', fontSize: 34, cursor: 'pointer' }}>&larr;</button>

      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 'min(60vw, 60vh)', maxHeight: 'min(60vw, 60vh)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={img.src} alt={img.title || ''} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
      </div>

      <button aria-label="Next" onClick={(e) => { e.stopPropagation(); onNext(); }} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#fff', fontSize: 34, cursor: 'pointer' }}>&rarr;</button>
      <button aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'absolute', right: 28, top: 28, background: 'transparent', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}>✕</button>
    </div>
  );
}
