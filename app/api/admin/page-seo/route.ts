import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import type { PageSeoRow } from '../../../../lib/pageSeo';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

function toPublicSeoImageUrl(path: string | null | undefined): string | undefined {
  if (!path || !SUPABASE_URL) return undefined;
  const base = SUPABASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/storage/v1/object/public/seo-assets/${clean}`;
}

/** GET ?slug=xxx — lecture des paramètres SEO d’une page (admin). */
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    }
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug')?.trim();
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('page_seo_settings')
      .select('*')
      .eq('page_slug', slug)
      .limit(1)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const row = data as PageSeoRow | null;
    if (!row) {
      return NextResponse.json({ seo: null });
    }
    return NextResponse.json({
      seo: {
        ...row,
        og_image_url: toPublicSeoImageUrl(row.og_image_path),
        twitter_image_url: toPublicSeoImageUrl(row.twitter_image_path),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}

/** POST — création/mise à jour des paramètres SEO d’une page (admin). */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    }
    const body = await req.json();
    const page_slug = body?.page_slug?.trim();
    if (!page_slug) {
      return NextResponse.json({ error: 'page_slug required' }, { status: 400 });
    }
    const payload: Record<string, unknown> = {
      page_slug,
      meta_title: body.meta_title ?? null,
      meta_description: body.meta_description ?? null,
      h1: body.h1 ?? null,
      canonical_url: body.canonical_url ?? null,
      robots_index: body.robots_index !== false,
      robots_follow: body.robots_follow !== false,
      og_title: body.og_title ?? null,
      og_description: body.og_description ?? null,
      og_image_path: body.og_image_path ?? null,
      og_type: body.og_type ?? 'website',
      og_site_name: body.og_site_name ?? null,
      twitter_card: body.twitter_card ?? 'summary_large_image',
      twitter_title: body.twitter_title ?? null,
      twitter_description: body.twitter_description ?? null,
      twitter_image_path: body.twitter_image_path ?? null,
      json_ld: body.json_ld ?? null,
    };
    const { data, error } = await supabaseAdmin
      .from('page_seo_settings')
      .upsert(payload, { onConflict: 'page_slug' });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
