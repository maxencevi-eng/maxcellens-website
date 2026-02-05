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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute',
          right: 20,
          top: 20,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 28,
          cursor: 'pointer',
          padding: 8,
          zIndex: 2,
        }}
      >
        ✕
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
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
            width={1200}
            height={800}
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
          <button
            type="button"
            aria-label="Photo précédente"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              width: 44,
              height: 44,
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            ←
          </button>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, minWidth: 48, textAlign: 'center' }}>
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            aria-label="Photo suivante"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              width: 44,
              height: 44,
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            →
          </button>
          </div>
        )}
      </div>
    </div>
  );
}
