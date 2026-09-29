import { supabaseAdmin } from './supabaseAdmin';
import { getBlocksForPage } from './pages';
import { readManagedHomeBlocks } from './managedHomeBlocks';
import { builtinSlug, type BuiltinPageKey } from '../components/PageBuilder/builtinPages';
import type { PageBlock } from '../components/PageBuilder/pageTypes';

export type BuiltinPagePayload = { pageId: string | null; managedHome?: boolean; blocks: PageBlock[] };

/**
 * Blocs publics d'une page historique, lus côté serveur. Même contenu que
 * GET /api/builtin-pages/:key pour un visiteur : la page arrive directement
 * avec ses blocs, au lieu de les remplacer après un appel côté navigateur.
 */
export async function readBuiltinPagePublic(key: BuiltinPageKey): Promise<BuiltinPagePayload | undefined> {
  if (!supabaseAdmin) return undefined;
  try {
    const { data: page } = await supabaseAdmin.from('site_pages').select('id').eq('slug', builtinSlug(key)).maybeSingle();
    if (!page) return key === 'home' ? undefined : { pageId: null, blocks: [] };
    const pageId = String((page as any).id);
    const blocks = await getBlocksForPage(pageId, { includeDrafts: false });
    if (key !== 'home') return { pageId, blocks };
    return { pageId, managedHome: true, blocks: [...await readManagedHomeBlocks(pageId, false), ...blocks] };
  } catch (e) {
    console.error('readBuiltinPagePublic', e);
    return undefined;
  }
}
