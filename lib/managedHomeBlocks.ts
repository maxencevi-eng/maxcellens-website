import { supabaseAdmin } from './supabaseAdmin';
import { homeBlockDefaults, MANAGED_HOME_BLOCKS, legacyOrderId, isManagedHomeType } from '../components/HomeBlocks/managedHomeDefs';
import type { PageBlock } from '../components/PageBuilder/pageTypes';
import { sanitizeBlockData } from './sanitizeBlockData';

function parse(value: string | undefined, fallback: any) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
export async function readManagedHomeBlocks(pageId: string, includeHidden: boolean): Promise<PageBlock[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.from('site_settings').select('key,value');
  if (error) throw error;
  const settings = Object.fromEntries((data || []).map(row => [row.key, row.value]));
  const hidden = parse(settings.block_visibility, []);
  const widths = parse(settings.block_width_mode, {});
  return MANAGED_HOME_BLOCKS.flatMap(([type], position) => {
    const state = parse(settings[`managed_${type}`], {});
    if (state.deleted) return [];
    const visible = state.visible ?? !hidden.includes(legacyOrderId(type));
    if (!includeHidden && !visible) return [];
    const content = type === 'home_clients'
      ? Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith('clients_')))
      : parse(settings[type], homeBlockDefaults(type));
    return [{ id: `legacy:${type}`, pageId, type, position, visible, widthMode: state.widthMode || widths[legacyOrderId(type)] || 'full', data: content }];
  });
}

export async function mutateManagedHomeBlock(id: string, patch: any, remove = false) {
  if (!supabaseAdmin) throw new Error('Stockage indisponible');
  const type = id.slice('legacy:'.length);
  if (!isManagedHomeType(type)) throw new Error('Type de bloc inconnu');
  const stateKey = `managed_${type}`;
  const { data: row, error: readError } = await supabaseAdmin.from('site_settings').select('value').eq('key', stateKey).maybeSingle();
  if (readError) throw readError;
  const state = parse(row?.value, {});
  if (state.deleted && !remove) throw new Error('Ce bloc a été supprimé');
  const changes: { key: string; value: string }[] = [];
  if (remove) {
    // A persistent deletion marker prevents fallback defaults from recreating it.
    state.deleted = true;
  } else {
    if (typeof patch.visible === 'boolean') state.visible = patch.visible;
    if (['full', 'max1600'].includes(patch.widthMode)) state.widthMode = patch.widthMode;
    if (patch.data) {
      if (type === 'home_clients') {
        for (const [key, value] of Object.entries(patch.data)) {
          if (key.startsWith('clients_')) changes.push({ key, value: String(value ?? '') });
        }
      } else changes.push({ key: type, value: JSON.stringify(await sanitizeBlockData(type, patch.data)) });
    }
  }
  changes.push({ key: stateKey, value: JSON.stringify(state) });
  const { error } = await supabaseAdmin.from('site_settings').upsert(changes, { onConflict: 'key' });
  if (error) throw error;
  if (remove && type !== 'home_clients') {
    const { error: deleteError } = await supabaseAdmin.from('site_settings').delete().eq('key', type);
    if (deleteError) throw deleteError;
  }
}
