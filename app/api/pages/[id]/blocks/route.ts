import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { getAuthUser } from '../../../../../lib/adminAuth';
import { sanitizeBlockData } from '../../../../../lib/sanitizeBlockData';
import { rowToBlock } from '../../../../../components/PageBuilder/pageTypes';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/pages/:id/blocks — tous les blocs, masqués compris (admin). */
export async function GET(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from('page_blocks')
    .select('*')
    .eq('page_id', id)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocks: (data || []).map(rowToBlock) });
}

/**
 * POST /api/pages/:id/blocks
 * Ajoute un bloc. `position` insère à cet index ; sans elle, le bloc va à la fin.
 */
export async function POST(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const type = String(body?.type || '').trim();
    if (!type) return NextResponse.json({ error: 'Le type de bloc est requis.' }, { status: 400 });

    const { data: siblings } = await supabaseAdmin
      .from('page_blocks')
      .select('id,position')
      .eq('page_id', id)
      .order('position', { ascending: true });

    const list = siblings || [];
    const at = typeof body?.position === 'number'
      ? Math.max(0, Math.min(list.length, body.position))
      : list.length;

    // Décale les blocs situés après le point d'insertion. Fait en série :
    // les pages comptent quelques dizaines de blocs au plus.
    for (let i = list.length - 1; i >= at; i--) {
      await supabaseAdmin
        .from('page_blocks')
        .update({ position: i + 1 })
        .eq('id', (list[i] as any).id);
    }

    const { data, error } = await supabaseAdmin
      .from('page_blocks')
      .insert({
        page_id: id,
        type,
        position: at,
        visible: body?.visible !== false,
        width_mode: body?.widthMode === 'max1600' ? 'max1600' : 'full',
        // Le HTML est assaini ici, pas au rendu : un bloc en base est toujours sûr.
        data: await sanitizeBlockData(type, body?.data ?? {}),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await revalidateForPage(id);
    return NextResponse.json({ block: rowToBlock(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/pages/:id/blocks
 * Réordonne : le corps porte `{ order: [blockId, …] }`.
 */
export async function PUT(req: Request, ctx: Ctx) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const order: unknown = body?.order;
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: '`order` doit être un tableau d’identifiants.' }, { status: 400 });
    }

    for (let i = 0; i < order.length; i++) {
      const blockId = String(order[i]);
      // `page_id` dans le filtre : un identifiant d'une autre page ne peut pas
      // être déplacé par cette route.
      await supabaseAdmin
        .from('page_blocks')
        .update({ position: i })
        .eq('id', blockId)
        .eq('page_id', id);
    }

    await revalidateForPage(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}

async function revalidateForPage(pageId: string) {
  try {
    if (!supabaseAdmin) return;
    const { data } = await supabaseAdmin
      .from('site_pages')
      .select('slug')
      .eq('id', pageId)
      .maybeSingle();
    const slug = (data as any)?.slug;
    if (slug) revalidatePath(`/${slug}`);
    revalidatePath('/admin');
  } catch (_) {}
}
