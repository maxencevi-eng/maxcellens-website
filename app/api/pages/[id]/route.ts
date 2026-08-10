import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getAuthUser } from '../../../../lib/adminAuth';
import { getBlocksForPage } from '../../../../lib/pages';
import { rowToPage, slugify, validateSlug } from '../../../../components/PageBuilder/pageTypes';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/pages/:id — page complète avec ses blocs (admin uniquement). */
export async function GET(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from('site_pages')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Page introuvable' }, { status: 404 });

  const blocks = await getBlocksForPage(id, { includeDrafts: true });
  return NextResponse.json({ page: rowToPage(data, blocks) });
}

/** PATCH /api/pages/:id — renommage, publication, ordre, header, SEO. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 });
      patch.title = title;
    }

    if (typeof body.slug === 'string') {
      const slug = slugify(body.slug);
      const check = validateSlug(slug);
      if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

      const { data: clash } = await supabaseAdmin
        .from('site_pages')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: `Une autre page utilise déjà le slug « ${slug} ».` },
          { status: 409 }
        );
      }
      patch.slug = slug;
    }

    if (body.status === 'draft' || body.status === 'published') patch.status = body.status;
    if (typeof body.position === 'number') patch.position = body.position;
    if (typeof body.showInMenu === 'boolean') patch.show_in_menu = body.showInMenu;
    if ('header' in body) patch.header = body.header ?? null;
    if ('seo' in body) patch.seo = body.seo ?? null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 });
    }

    // On lit l'ancien slug AVANT la mise à jour : si le slug change, l'ancienne
    // URL doit être invalidée elle aussi, sinon elle reste servie depuis le
    // cache alors qu'elle est devenue un 404.
    const { data: before } = await supabaseAdmin
      .from('site_pages')
      .select('slug')
      .eq('id', id)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from('site_pages')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePages([(before as any)?.slug, (data as any)?.slug]);
    return NextResponse.json({ page: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/pages/:id
 * Suppression douce par défaut (corbeille 30 jours).
 * `?hard=1` supprime définitivement, avec ses blocs par cascade.
 */
export async function DELETE(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;
  const hard = new URL(req.url).searchParams.get('hard') === '1';

  const { data: page } = await supabaseAdmin
    .from('site_pages')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  if (hard) {
    // Les médias référencés par les blocs sont nettoyés côté client avant
    // l'appel (chaque bloc connaît ses propres ressources).
    const { error } = await supabaseAdmin.from('site_pages').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from('site_pages')
      .update({ deleted_at: new Date().toISOString(), status: 'draft' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePages([(page as any)?.slug]);
  return NextResponse.json({ ok: true });
}

function revalidatePages(slugs: (string | undefined)[]) {
  try {
    revalidatePath('/admin');
    for (const slug of slugs) {
      if (slug) revalidatePath(`/${slug}`);
    }
  } catch (_) {
    // revalidatePath échoue hors contexte de rendu : sans conséquence ici
  }
}
