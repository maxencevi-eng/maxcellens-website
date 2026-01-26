import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// Simple GET/POST to read/write key/value settings in `site_settings` table.
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const url = new URL(req.url);
    const keysParam = url.searchParams.get('keys') || '';
    const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean);

    if (!keys.length) {
      // return all settings
      const { data, error } = await supabaseAdmin.from('site_settings').select('*');
      if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => map[r.key] = r.value);
      return NextResponse.json({ settings: map });
    }

    const map: Record<string, string> = {};
    for (const key of keys) {
      const { data, error } = await supabaseAdmin.from('site_settings').select('value').eq('key', key).limit(1).maybeSingle();
      if (error) {
        console.warn('site-settings GET error for', key, error);
        continue;
      }
      if (data && typeof data.value !== 'undefined') map[key] = data.value;
    }
    return NextResponse.json({ settings: map });
  } catch (err: any) {
    console.error('site-settings GET error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const body = await req.json();
    const { key, value } = body || {};
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    let val = String(value ?? '');
    // sanitize HTML for known keys
    if (key === 'footerColumn1' || key === 'footerBottomText') {
      try {
        const sanitizeHtml = await import('sanitize-html');
        val = sanitizeHtml.default(val, {
          allowedTags: sanitizeHtml.default.defaults.allowedTags.concat(['img']),
          allowedAttributes: {
            ...sanitizeHtml.default.defaults.allowedAttributes,
            img: ['src','alt','width','height']
          }
        });
      } catch (_) { val = '' }
    }

    const payload = { key: String(key), value: val };
    const { data, error } = await supabaseAdmin.from('site_settings').upsert(payload, { onConflict: 'key' });
    if (error) {
      console.error('site-settings upsert error', error);
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('site-settings POST error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
