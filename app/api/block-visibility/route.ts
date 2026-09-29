import { NextResponse } from 'next/server';
import { readBlockVisibility, type BlockOrders } from '../../../lib/blockVisibility';
import { BLOCK_ORDER_PAGES } from '../../../components/BlockVisibility/blockOrders';

export const dynamic = 'force-dynamic';

/**
 * Réponse renvoyée au client.
 *
 * `orders` est le format courant. Les champs `blockOrderXxx` sont conservés
 * pour les clients déjà servis avant un déploiement — ils seront retirés une
 * fois toutes les pages migrées.
 */
function buildPayload(
  hiddenBlocks: string[],
  blockWidthModes: Record<string, 'full' | 'max1600'>,
  orders: BlockOrders
) {
  const legacy: Record<string, string[]> = {};
  for (const page of BLOCK_ORDER_PAGES) {
    legacy[`blockOrder${page.charAt(0).toUpperCase()}${page.slice(1)}`] = orders[page];
  }
  return { hiddenBlocks, blockWidthModes, orders, ...legacy };
}

/** GET : blocs masqués + modes de largeur + ordre des blocs par page (public). */
export async function GET() {
  const { hiddenBlocks, blockWidthModes, orders } = await readBlockVisibility();
  return NextResponse.json(buildPayload(hiddenBlocks, blockWidthModes, orders));
}
