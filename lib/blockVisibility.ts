import { supabaseAdmin, supabaseUrl, serviceKey } from './supabaseAdmin';
import {
  BLOCK_ORDER_PAGES,
  DEFAULT_BLOCK_ORDERS,
  orderSettingKey,
  parseBlockOrder,
  type BlockOrderPage,
} from '../components/BlockVisibility/blockOrders';

export type BlockOrders = Record<BlockOrderPage, string[]>;

export type BlockVisibilityData = {
  hiddenBlocks: string[];
  blockWidthModes: Record<string, 'full' | 'max1600'>;
  orders: BlockOrders;
};

function defaultOrders(): BlockOrders {
  const out = {} as BlockOrders;
  for (const page of BLOCK_ORDER_PAGES) out[page] = [...DEFAULT_BLOCK_ORDERS[page]];
  return out;
}

/**
 * Blocs masqués, modes de largeur et ordre des blocs de chaque page.
 * Lu par l'API publique et par le layout serveur : le premier rendu arrive
 * donc directement avec le bon ordre, sans réorganisation visible au chargement.
 */
export async function readBlockVisibility(): Promise<BlockVisibilityData> {
  const empty: BlockVisibilityData = { hiddenBlocks: [], blockWidthModes: {}, orders: defaultOrders() };
  if (!supabaseAdmin || !supabaseUrl || !serviceKey) return empty;
  try {
    const keys = ['block_visibility', 'block_width_mode', ...BLOCK_ORDER_PAGES.map(orderSettingKey)];
    const { data } = await supabaseAdmin.from('site_settings').select('key,value').in('key', keys as any);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => {
      if (r && typeof r.key === 'string') map[r.key] = String(r.value ?? '');
    });

    let hiddenBlocks: string[] = [];
    if (map.block_visibility) {
      try {
        const parsed = JSON.parse(map.block_visibility);
        if (Array.isArray(parsed)) hiddenBlocks = parsed.filter((v) => typeof v === 'string');
        else if (Array.isArray(parsed?.hiddenBlocks)) hiddenBlocks = parsed.hiddenBlocks;
      } catch {
        // valeur illisible → aucun bloc masqué
      }
    }

    let blockWidthModes: Record<string, 'full' | 'max1600'> = {};
    if (map.block_width_mode) {
      try {
        const parsed = JSON.parse(map.block_width_mode);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) blockWidthModes = parsed;
      } catch {
        // valeur illisible → tous les blocs en pleine largeur
      }
    }

    const orders = {} as BlockOrders;
    for (const page of BLOCK_ORDER_PAGES) {
      orders[page] = parseBlockOrder(map[orderSettingKey(page)], DEFAULT_BLOCK_ORDERS[page]);
    }
    return { hiddenBlocks, blockWidthModes, orders };
  } catch (e) {
    console.error('readBlockVisibility error', e);
    return empty;
  }
}
