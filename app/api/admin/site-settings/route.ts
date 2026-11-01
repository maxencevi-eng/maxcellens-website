import { NextResponse } from 'next/server';
import { isAdminRequest, requireAdmin } from '@/lib/adminAuth';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

/** Réglages réservés à l'admin (IP exclues des statistiques, etc.). */
const isPrivateKey = (key: string) => key.startsWith('analytics_');

// GET public (le site lit ses réglages d'affichage) ; POST réservé à l'admin.
export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
  const keys = (new URL(req.url).searchParams.get('keys') || '').split(',').map((k) => k.trim()).filter(Boolean);
  const admin = keys.some(isPrivateKey) || !keys.length ? await isAdminRequest(req) : false;

  let query = supabaseAdmin.from('site_settings').select('key,value');
  if (keys.length) query = query.in('key', keys);
  const { data, error } = await query;
  if (error) {
    console.error('site-settings GET error', error);
    return NextResponse.json({ error: 'Lecture des réglages impossible' }, { status: 500 });
  }

  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => {
    if (r && typeof r.key === 'string' && (admin || !isPrivateKey(r.key))) map[r.key] = r.value;
  });
  return NextResponse.json({ settings: map });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
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
            '*': ['style'],
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

    // Invalidate cache for all pages since site settings affect multiple pages
    try { revalidatePath('/'); } catch (_) {}

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('site-settings POST error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
