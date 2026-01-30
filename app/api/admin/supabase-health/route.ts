import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: 'Admin credentials not configured' }, { status: 503 });
    try {
      // try listing a small part of the bucket to verify storage access
      const bucket = 'site-assets';
      const res = await supabaseAdmin.storage.from(bucket).list('', { limit: 1 });
      if ((res as any).error) {
        return NextResponse.json({ ok: false, error: (res as any).error?.message || 'Storage error' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
