"use client";

import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { AdminToolbarButton } from '../admin/AdminToolbar';
import { useBlockVisibility } from './BlockVisibilityContext';
import type { BlockOrderPage } from './blockOrders';

/**
 * Flèches de déplacement d'un bloc historique.
 *
 * L'ordre lu est celui de la page entière — blocs intégrés ET blocs ajoutés
 * depuis l'administration (identifiants `dyn:…`). Un bloc d'origine peut donc
 * être déplacé au-dessus ou en dessous d'un bloc ajouté, et réciproquement.
 */
export default function BlockOrderButtons({
  page,
  blockId,
}: {
  page: BlockOrderPage;
  blockId: string;
}) {
  const { getOrder, isAdmin, moveBlock } = useBlockVisibility();
  if (!isAdmin) return null;

  const order = getOrder(page);
  const index = order.indexOf(blockId);
  const canMoveUp = index > 0;
  const canMoveDown = index >= 0 && index < order.length - 1;

  return (
    <>
      <AdminToolbarButton
        icon={<ArrowUp size={14} aria-hidden="true" />}
        label="Monter le bloc"
        disabled={!canMoveUp}
        onClick={() => moveBlock(page, blockId, 'up')}
      />
      <AdminToolbarButton
        icon={<ArrowDown size={14} aria-hidden="true" />}
        label="Descendre le bloc"
        disabled={!canMoveDown}
        onClick={() => moveBlock(page, blockId, 'down')}
      />
    </>
  );
}
