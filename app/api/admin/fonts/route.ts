import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const bucket = 'fonts';
    const { data, error } = await supabaseAdmin.storage.from(bucket).list('uploads', { limit: 200, offset: 0 });
    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    const items = (data || []).map((it: any) => ({ name: it.name, path: `uploads/${it.name}` }));
    const subjects = await Promise.all(items.map(async (it: any) => {
      const gp = supabaseAdmin.storage.from(bucket).getPublicUrl(it.path);
      const publicUrl = gp?.data?.publicUrl || '';
      return { name: it.name, url: publicUrl };
    }));
    return NextResponse.json({ ok: true, fonts: subjects });
  } catch (err: any) {
    console.error('fonts listing error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
