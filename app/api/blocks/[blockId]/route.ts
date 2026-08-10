import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getAuthUser } from '../../../../lib/adminAuth';
import { sanitizeBlockData } from '../../../../lib/sanitizeBlockData';
import { rowToBlock } from '../../../../components/PageBuilder/pageTypes';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ blockId: string }> };

/** PATCH /api/blocks/:blockId — contenu, visibilité, largeur. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { blockId } = await ctx.params;

  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if ('data' in body) {
      // Le type du bloc vient de la base, pas du corps de la requête : un
      // appelant ne peut pas déclarer un type inoffensif pour contourner
      // l'assainissement du HTML.
      const { data: current } = await supabaseAdmin
        .from('page_blocks')
        .select('type')
        .eq('id', blockId)
        .maybeSingle();
      const type = String((current as any)?.type || '');
      if (!type) return NextResponse.json({ error: 'Bloc introuvable' }, { status: 404 });
      patch.data = await sanitizeBlockData(type, body.data ?? {});
    }

    if (typeof body.visible === 'boolean') patch.visible = body.visible;
    if (body.widthMode === 'full' || body.widthMode === 'max1600') {
      patch.width_mode = body.widthMode;
    }
    if (typeof body.position === 'number') patch.position = body.position;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('page_blocks')
      .update(patch)
      .eq('id', blockId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await revalidateForBlock((data as any)?.page_id);
    return NextResponse.json({ block: rowToBlock(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/blocks/:blockId
 * Supprime le bloc puis renumérote ses frères, afin que les positions restent
 * une suite continue (sans quoi les insertions ultérieures se décalent).
 */
export async function DELETE(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { blockId } = await ctx.params;

  const { data: block } = await supabaseAdmin
    .from('page_blocks')
    .select('page_id')
    .eq('id', blockId)
    .maybeSingle();

  const { error } = await supabaseAdmin.from('page_blocks').delete().eq('id', blockId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pageId = (block as any)?.page_id;
  if (pageId) {
    const { data: rest } = await supabaseAdmin
      .from('page_blocks')
      .select('id')
      .eq('page_id', pageId)
      .order('position', { ascending: true });
    const list = rest || [];
    for (let i = 0; i < list.length; i++) {
      await supabaseAdmin
        .from('page_blocks')
        .update({ position: i })
        .eq('id', (list[i] as any).id);
    }
    await revalidateForBlock(pageId);
  }

  return NextResponse.json({ ok: true });
}

async function revalidateForBlock(pageId?: string) {
  if (!pageId || !supabaseAdmin) return;
  try {
    const { data } = await supabaseAdmin
      .from('site_pages')
      .select('slug')
      .eq('id', pageId)
      .maybeSingle();
    const slug = (data as any)?.slug;
    if (slug) revalidatePath(`/${slug}`);
  } catch (_) {}
}
