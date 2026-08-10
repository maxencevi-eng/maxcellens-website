import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl, serviceKey } from '../../../lib/supabaseAdmin';
import {
  BLOCK_ORDER_PAGES,
  DEFAULT_BLOCK_ORDERS,
  orderSettingKey,
  parseBlockOrder,
  type BlockOrderPage,
} from '../../../components/BlockVisibility/blockOrders';

export const dynamic = 'force-dynamic';

type Orders = Record<BlockOrderPage, string[]>;

function defaultOrders(): Orders {
  const out = {} as Orders;
  for (const page of BLOCK_ORDER_PAGES) out[page] = [...DEFAULT_BLOCK_ORDERS[page]];
  return out;
}

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
  orders: Orders
) {
  const legacy: Record<string, string[]> = {};
  for (const page of BLOCK_ORDER_PAGES) {
    legacy[`blockOrder${page.charAt(0).toUpperCase()}${page.slice(1)}`] = orders[page];
  }
  return { hiddenBlocks, blockWidthModes, orders, ...legacy };
}

/** GET : blocs masqués + modes de largeur + ordre des blocs par page (public). */
export async function GET() {
  try {
    if (!supabaseAdmin || !supabaseUrl || !serviceKey) {
      return NextResponse.json(buildPayload([], {}, defaultOrders()));
    }

    // Une seule requête pour toutes les clés : l'ancienne version en émettait
    // dix en série, ce qui allongeait d'autant le premier rendu.
    const keys = [
      'block_visibility',
      'block_width_mode',
      ...BLOCK_ORDER_PAGES.map(orderSettingKey),
    ];
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('key,value')
      .in('key', keys as any);

    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => {
      if (r && typeof r.key === 'string') map[r.key] = String(r.value ?? '');
    });

    let hiddenBlocks: string[] = [];
    const rawHidden = map['block_visibility'];
    if (rawHidden) {
      try {
        const parsed = JSON.parse(rawHidden);
        if (Array.isArray(parsed)) hiddenBlocks = parsed.filter((v) => typeof v === 'string');
        else if (Array.isArray(parsed?.hiddenBlocks)) hiddenBlocks = parsed.hiddenBlocks;
      } catch {
        // valeur illisible → aucun bloc masqué
      }
    }

    let blockWidthModes: Record<string, 'full' | 'max1600'> = {};
    const rawWidth = map['block_width_mode'];
    if (rawWidth) {
      try {
        const parsed = JSON.parse(rawWidth);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          blockWidthModes = parsed;
        }
      } catch {
        // valeur illisible → tous les blocs en pleine largeur
      }
    }

    const orders = {} as Orders;
    for (const page of BLOCK_ORDER_PAGES) {
      orders[page] = parseBlockOrder(map[orderSettingKey(page)], DEFAULT_BLOCK_ORDERS[page]);
    }

    return NextResponse.json(buildPayload(hiddenBlocks, blockWidthModes, orders));
  } catch (e) {
    console.error('block-visibility GET error', e);
    return NextResponse.json(buildPayload([], {}, defaultOrders()));
  }
}
