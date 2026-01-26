import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const url = new URL(req.url);
    const category = (url.searchParams.get('category') || 'logos').toLowerCase();
    const bucket = 'site-assets';

    let path = 'logos/site-logo.webp';
    if (category === 'favicons') path = 'favicons/favicon.webp';
    if (category === 'footer') path = 'logos/footer-logo.webp';

    // try to download the object to measure size
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
    if (error || !data) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const arr = await data.arrayBuffer();
    const size = arr.byteLength;
    const gp = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = gp?.data?.publicUrl || '';

    return NextResponse.json({ exists: true, size, publicUrl });
  } catch (err: any) {
    console.error('logo-status error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
