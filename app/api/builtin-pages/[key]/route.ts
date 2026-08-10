import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getAuthUser } from '../../../../lib/adminAuth';
import { getBlocksForPage } from '../../../../lib/pages';
import { rowToBlock } from '../../../../components/PageBuilder/pageTypes';
import {
  builtinLabel,
  builtinSlug,
  isBuiltinKey,
} from '../../../../components/PageBuilder/builtinPages';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ key: string }> };

/**
 * GET /api/builtin-pages/:key
 *
 * Renvoie la page hôte d'une page historique et ses blocs additionnels.
 * La ligne est créée à la volée au premier accès admin : inutile de
 * pré-remplir la table, et une page historique sans bloc ajouté ne coûte
 * aucune écriture.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { key } = await ctx.params;
  if (!isBuiltinKey(key)) {
    return NextResponse.json({ error: 'Page inconnue' }, { status: 404 });
  }
  if (!supabaseAdmin) return NextResponse.json({ pageId: null, blocks: [] });

  const admin = await getAuthUser(req);
  const slug = builtinSlug(key);

  try {
    let { data: page } = await supabaseAdmin
      .from('site_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!page) {
      // Sans session admin on ne crée rien : un visiteur ne doit pas pouvoir
      // provoquer d'écriture, et une page sans hôte n'a simplement aucun bloc.
      if (!admin) return NextResponse.json({ pageId: null, blocks: [] });

      const { data: created, error } = await supabaseAdmin
        .from('site_pages')
        .insert({
          slug,
          title: builtinLabel(key as any),
          // `published` pour que les blocs soient servis aux visiteurs ;
          // le slug préfixé la garde hors des listes et du sitemap.
          status: 'published',
          position: 0,
          show_in_menu: false,
        })
        .select('id')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      page = created;
    }

    const pageId = String((page as any).id);
    const blocks = await getBlocksForPage(pageId, { includeDrafts: Boolean(admin) });
    return NextResponse.json({ pageId, blocks });
  } catch (e: any) {
    console.error('builtin-pages GET', e);
    return NextResponse.json({ pageId: null, blocks: [] });
  }
}
