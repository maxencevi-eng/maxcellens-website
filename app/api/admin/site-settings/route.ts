import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl, serviceKey } from '../../../../lib/supabaseAdmin';

// Simple GET/POST to read/write key/value settings in `site_settings` table.
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const url = new URL(req.url);
    const keysParam = url.searchParams.get('keys') || '';
    const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean);

    if (!keys.length) {
      // return all settings via PostgREST to avoid client library issues
      try {
        const resp = await fetch(`${supabaseUrl.replace(/\/+$/,'')}/rest/v1/site_settings?select=key,value`, {
          headers: {
            apikey: String(serviceKey),
            Authorization: `Bearer ${String(serviceKey)}`
          }
        });
        if (!resp.ok) return NextResponse.json({ error: `Supabase REST error ${resp.status}` }, { status: 500 });
        const data = await resp.json();
        const map: Record<string, string> = {};
        (data || []).forEach((r: any) => { if (r && typeof r.key !== 'undefined') map[r.key] = r.value; });
        return NextResponse.json({ settings: map });
      } catch (e) {
        console.error('site-settings REST fetch error', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
      }
    }

    const map: Record<string, string> = {};
    console.log('site-settings GET keys:', keys);
    try {
      // Query PostgREST and filter server-side
      const resp = await fetch(`${supabaseUrl.replace(/\/+$/,'')}/rest/v1/site_settings?select=key,value`, {
        headers: {
          apikey: String(serviceKey),
          Authorization: `Bearer ${String(serviceKey)}`
        }
      });
      if (!resp.ok) {
        console.error('site-settings REST bulk fetch failed', resp.status);
        return NextResponse.json({ error: `Supabase REST error ${resp.status}` }, { status: 500 });
      }
      const data = await resp.json();
      (data || []).forEach((r: any) => { if (r && typeof r.key !== 'undefined' && keys.includes(r.key)) map[r.key] = r.value; });
      return NextResponse.json({ settings: map });
    } catch (e) {
      console.error('site-settings REST bulk exception', e);
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
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
