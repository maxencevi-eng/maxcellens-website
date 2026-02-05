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

  const navButtonStyle = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    width: 44,
    height: 44,
    borderRadius: '50%',
    cursor: 'pointer' as const,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  };

  return (
    <div
      onClick={wrapperClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute',
          right: 28,
          top: 28,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 26,
          cursor: 'pointer',
          padding: 8,
          zIndex: 2,
        }}
      >
        ✕
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '95vw',
            maxHeight: '85vh',
          }}
        >
          <img
            src={img.src}
            alt={img.title || ''}
            style={{
              maxWidth: '95vw',
              maxHeight: '85vh',
              width: 'auto',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </div>

        {images.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              marginTop: 16,
            }}
          >
            <button type="button" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); onPrev(); }} style={navButtonStyle}>
              ←
            </button>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, minWidth: 48, textAlign: 'center' }}>
              {index + 1} / {images.length}
            </span>
            <button type="button" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); onNext(); }} style={navButtonStyle}>
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
