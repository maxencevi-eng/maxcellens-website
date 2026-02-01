import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

/**
 * Migre les photos d'une galerie vers un nouveau slug (après renommage).
 * Copie site_settings[gallery_photos_<oldSlug>] vers gallery_photos_<newSlug>
 * puis supprime l'ancienne clé pour garder une seule source de vérité.
 */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    const oldSlug = typeof body?.oldSlug === 'string' ? body.oldSlug.trim() : '';
    const newSlug = typeof body?.newSlug === 'string' ? body.newSlug.trim() : '';

    if (!oldSlug || !newSlug) {
      return NextResponse.json({ error: 'oldSlug and newSlug required' }, { status: 400 });
    }
    if (oldSlug === newSlug) {
      return NextResponse.json({ ok: true, migrated: false, message: 'Slug unchanged' });
    }

    const oldKey = `gallery_photos_${oldSlug}`;
    const newKey = `gallery_photos_${newSlug}`;

    const { data: row, error: selectError } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', oldKey)
      .maybeSingle();

    if (selectError) {
      console.error('migrate-gallery-photos select error', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (!row?.value) {
      return NextResponse.json({ ok: true, migrated: false, message: 'No data to migrate' });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('site_settings')
      .upsert({ key: newKey, value: row.value }, { onConflict: 'key' });

    if (upsertError) {
      console.error('migrate-gallery-photos upsert error', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    await supabaseAdmin.from('site_settings').delete().eq('key', oldKey);

    return NextResponse.json({ ok: true, migrated: true, fromKey: oldKey, toKey: newKey });
  } catch (err: any) {
    console.error('migrate-gallery-photos error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
