"use client";

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AdminToolbarButton } from '../admin/AdminToolbar';
import { useBlockVisibility } from './BlockVisibilityContext';

/**
 * Masquer / afficher un bloc historique.
 *
 * Rend désormais un bouton du design system : les pages d'origine et celles
 * du page builder présentent la même barre d'outils.
 */
export default function BlockVisibilityToggle({ blockId }: { blockId: string }) {
  const { hiddenBlocks, isAdmin, toggleBlock } = useBlockVisibility();
  if (!isAdmin) return null;

  const hidden = hiddenBlocks.includes(blockId);
  return (
    <AdminToolbarButton
      icon={hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      label={hidden ? 'Afficher le bloc' : 'Masquer le bloc'}
      active={hidden}
      onClick={() => toggleBlock(blockId)}
    />
  );
}
