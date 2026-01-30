import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const j = await req.json();
    const path = String(j?.path || '');
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const bucket = 'site-assets';
    try {
      const rem = await supabaseAdmin.storage.from(bucket).remove([path]);
      if (rem?.error) {
        return NextResponse.json({ error: rem.error.message || String(rem.error) }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
