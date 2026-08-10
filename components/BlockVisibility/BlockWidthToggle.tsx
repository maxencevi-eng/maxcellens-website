"use client";

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { AdminToolbarButton } from '../admin/AdminToolbar';
import { useBlockVisibility } from './BlockVisibilityContext';

/** Bascule pleine largeur / max 1600px d'un bloc historique. */
export default function BlockWidthToggle({ blockId }: { blockId: string }) {
  const { blockWidthModes, isAdmin, setBlockWidthMode } = useBlockVisibility();
  if (!isAdmin) return null;

  const isMax1600 = (blockWidthModes[blockId] ?? 'full') === 'max1600';
  return (
    <AdminToolbarButton
      icon={
        isMax1600
          ? <Maximize2 size={14} aria-hidden="true" />
          : <Minimize2 size={14} aria-hidden="true" />
      }
      label={isMax1600 ? 'Passer en pleine largeur' : 'Limiter à 1600px'}
      onClick={() => setBlockWidthMode(blockId, isMax1600 ? 'full' : 'max1600')}
    />
  );
}
