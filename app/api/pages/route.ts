import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthUser } from '../../../lib/adminAuth';
import { listPages } from '../../../lib/pages';
import { slugify, validateSlug } from '../../../components/PageBuilder/pageTypes';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pages
 * Liste les pages. Les brouillons ne sont renvoyés qu'à une session admin.
 */
export async function GET(req: Request) {
  const admin = await getAuthUser(req);
  const pages = await listPages({ includeDrafts: Boolean(admin) });
  return NextResponse.json({ pages });
}

/**
 * POST /api/pages
 * Crée une page. `slug` est dérivé du titre s'il n'est pas fourni.
 */
export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  }
  const admin = await getAuthUser(req);
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await req.json();
    const title = String(body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 });

    const slug = slugify(String(body?.slug || title));
    const check = validateSlug(slug);
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

    // Unicité : la contrainte SQL protège de toute façon, mais un message
    // clair vaut mieux qu'une erreur Postgres brute.
    const { data: existing } = await supabaseAdmin
      .from('site_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `Une page utilise déjà le slug « ${slug} ».` },
        { status: 409 }
      );
    }

    // Nouvelle page en fin de liste
    const { data: last } = await supabaseAdmin
      .from('site_pages')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = Number((last as any)?.position ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from('site_pages')
      .insert({
        slug,
        title,
        status: 'draft',
        position,
        show_in_menu: Boolean(body?.showInMenu),
        header: body?.header ?? null,
        seo: body?.seo ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('create page error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Page créée en brouillon : rien de public à invalider, mais le
    // gestionnaire et le tableau de bord doivent la voir.
    try { revalidatePath('/admin'); } catch (_) {}

    return NextResponse.json({ page: data });
  } catch (e: any) {
    console.error('POST /api/pages', e);
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
