import { supabaseAdmin } from './supabaseAdmin';
import { BUILTIN_PREFIX } from '../components/PageBuilder/builtinPages';
import {
  rowToBlock,
  rowToPage,
  type PageBlock,
  type SitePage,
  type SitePageSummary,
} from '../components/PageBuilder/pageTypes';

/**
 * Accès serveur aux pages dynamiques.
 *
 * Toutes les fonctions tolèrent l'absence de la table : le page builder peut
 * être déployé avant que `sql/page_builder.sql` n'ait été exécuté, et le site
 * doit continuer de fonctionner (les pages historiques ne dépendent pas de
 * ces tables).
 */

/** Vrai si l'erreur Supabase signale une table absente. */
function isMissingTable(error: any): boolean {
  const code = error?.code || '';
  const msg = String(error?.message || '');
  return code === '42P01' || /relation .* does not exist/i.test(msg);
}

export async function listPages(options?: {
  includeDrafts?: boolean;
}): Promise<SitePageSummary[]> {
  if (!supabaseAdmin) return [];
  try {
    let query = supabaseAdmin
      .from('site_pages')
      .select('id,slug,title,status,position,show_in_menu,updated_at,page_blocks(id)')
      .is('deleted_at', null)
      .not('slug', 'like', BUILTIN_PREFIX + '%')
      .order('position', { ascending: true });

    if (!options?.includeDrafts) query = query.eq('status', 'published');

    const { data, error } = await query;
    if (error) {
      if (!isMissingTable(error)) console.error('listPages error', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title ?? ''),
      status: row.status === 'published' ? 'published' : 'draft',
      position: Number(row.position ?? 0),
      showInMenu: Boolean(row.show_in_menu),
      blockCount: Array.isArray(row.page_blocks) ? row.page_blocks.length : 0,
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    }));
  } catch (e) {
    console.error('listPages exception', e);
    return [];
  }
}

/**
 * Charge une page par son slug, avec ses blocs ordonnés.
 *
 * `includeDrafts` n'est vrai que pour les requêtes authentifiées : un
 * brouillon ne doit jamais être servi à un visiteur.
 */
export async function getPageBySlug(
  slug: string,
  options?: { includeDrafts?: boolean }
): Promise<SitePage | null> {
  if (!supabaseAdmin || !slug) return null;
  try {
    let query = supabaseAdmin
      .from('site_pages')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .not('slug', 'like', BUILTIN_PREFIX + '%');

    if (!options?.includeDrafts) query = query.eq('status', 'published');

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (!isMissingTable(error)) console.error('getPageBySlug error', error);
      return null;
    }
    if (!data) return null;

    const blocks = await getBlocksForPage(String((data as any).id), options);
    return rowToPage(data, blocks);
  } catch (e) {
    console.error('getPageBySlug exception', e);
    return null;
  }
}

export async function getBlocksForPage(
  pageId: string,
  options?: { includeDrafts?: boolean }
): Promise<PageBlock[]> {
  if (!supabaseAdmin) return [];
  try {
    let query = supabaseAdmin
      .from('page_blocks')
      .select('*')
      .eq('page_id', pageId)
      .order('position', { ascending: true });

    // Un bloc masqué reste visible en admin (signalé par un liseré), mais
    // n'est jamais envoyé au visiteur.
    if (!options?.includeDrafts) query = query.eq('visible', true);

    const { data, error } = await query;
    if (error) {
      if (!isMissingTable(error)) console.error('getBlocksForPage error', error);
      return [];
    }
    return (data || []).map(rowToBlock);
  } catch (e) {
    console.error('getBlocksForPage exception', e);
    return [];
  }
}

/** Slugs publiés, pour le sitemap et le menu. */
export async function listPublishedSlugs(): Promise<
  { slug: string; updatedAt?: string }[]
> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('site_pages')
      .select('slug,updated_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .not('slug', 'like', BUILTIN_PREFIX + '%');
    if (error) {
      if (!isMissingTable(error)) console.error('listPublishedSlugs error', error);
      return [];
    }
    return (data || []).map((r: any) => ({
      slug: String(r.slug),
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }));
  } catch (e) {
    return [];
  }
}

/** Pages marquées « afficher dans le menu », dans l'ordre. */
export async function listMenuPages(): Promise<{ slug: string; title: string }[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('site_pages')
      .select('slug,title,position')
      .eq('status', 'published')
      .eq('show_in_menu', true)
      .is('deleted_at', null)
      .not('slug', 'like', BUILTIN_PREFIX + '%')
      .order('position', { ascending: true });
    if (error) return [];
    return (data || []).map((r: any) => ({
      slug: String(r.slug),
      title: String(r.title ?? ''),
    }));
  } catch (e) {
    return [];
  }
}
