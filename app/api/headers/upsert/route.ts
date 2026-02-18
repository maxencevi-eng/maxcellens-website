import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// Use the shared admin client; the module will warn if it's not configured.

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });

    const body = await req.json();
    const { page, image_path, public_url, alt } = body || {};
    if (!page || !image_path) return NextResponse.json({ error: 'page and image_path required' }, { status: 400 });
    // Normalize image_path to match CHECK constraint (must start with 'medias/')
    let storedPath = String(image_path);
    if (!storedPath.startsWith('medias/')) {
      // if image_path looks like just a filename, prepend bucket
      storedPath = `medias/${storedPath.replace(/^\/*/, '')}`;
    }

    // read previous row (if any) so we can remove previous image after successful upsert
    let prevPath: string | null = null;
    try {
      const existing = await supabaseAdmin.from('headers').select('image_path').eq('page', page).limit(1).maybeSingle();
      if (existing && (existing as any).data && (existing as any).data.image_path) prevPath = (existing as any).data.image_path;
    } catch (_) {}

    const { data, error } = await supabaseAdmin.from('headers').upsert(
      { page, image_path: storedPath, public_url, alt },
      { onConflict: 'page' }
    );
    if (error) {
      console.error('Upsert headers error', error);
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    // on success, remove previous stored image if different
    try {
      if (prevPath && prevPath !== storedPath) {
        const rem = await supabaseAdmin.storage.from('medias').remove([prevPath]);
        if (rem?.error) console.warn('Failed to delete old header image', rem.error, prevPath);
      }
    } catch (e) { console.warn('Error deleting previous header image', e); }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('Upsert route exception', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
