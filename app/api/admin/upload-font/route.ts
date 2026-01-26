import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const form = await req.formData();
    const file = form.get('file') as any;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arr = await file.arrayBuffer();
    const buf = Buffer.from(arr);

    // Validate extension
    const name = (file.name || `font-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const extMatch = name.match(/\.(woff2?|ttf|otf)$/i);
    if (!extMatch) return NextResponse.json({ error: 'Unsupported font format. Use .woff/.woff2/.ttf/.otf' }, { status: 400 });

    const path = `uploads/${Date.now()}-${name}`;
    const bucket = 'fonts';

    const up = await supabaseAdmin.storage.from(bucket).upload(path, buf, { upsert: false, contentType: file.type || 'font/woff2' });
    if (up.error) {
      console.error('upload-font error', up.error);
      return NextResponse.json({ error: up.error.message || String(up.error) }, { status: 500 });
    }

    const gp = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = gp?.data?.publicUrl || '';

    return NextResponse.json({ ok: true, publicUrl, path, name });
  } catch (err: any) {
    console.error('upload-font route error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
