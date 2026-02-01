"use client";

import React from 'react';
import { useBlockVisibility } from './BlockVisibilityContext';

const eyeSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const eyeOffSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

type Props = {
  blockId: string;
  style?: React.CSSProperties;
};

export default function BlockVisibilityToggle({ blockId, style }: Props) {
  const { hiddenBlocks, isAdmin, toggleBlock } = useBlockVisibility();
  if (!isAdmin) return null;
  const hidden = hiddenBlocks.includes(blockId);
  return (
    <button
      type="button"
      onClick={() => toggleBlock(blockId)}
      title={hidden ? 'Afficher le bloc pour les visiteurs' : 'Masquer le bloc pour les visiteurs'}
      aria-label={hidden ? 'Afficher le bloc' : 'Masquer le bloc'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        padding: 0,
        border: 'none',
        borderRadius: 6,
        background: hidden ? '#b91c1c' : '#111',
        color: '#fff',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        ...style,
      }}
    >
      {hidden ? eyeOffSvg : eyeSvg}
    </button>
  );
}
