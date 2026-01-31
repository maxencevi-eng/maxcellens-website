import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const BUCKET = 'seo-assets';

/** POST — suppression d’une image du bucket seo-assets (admin). */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    }
    const body = await req.json();
    const path = String(body?.path ?? '').trim();
    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
