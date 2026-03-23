// app/bac/api/config-textes/route.ts — Textes éditables (déroulé + bonnes pratiques)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin } from '../../../../lib/bac/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cle = searchParams.get('cle');

  let query = supabaseAdmin.from('bac_config_textes').select('cle, valeur');
  if (cle) query = (query as any).eq('cle', cle);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Retourne un objet { cle: valeur } pour faciliter l'usage côté client
  const result: Record<string, string> = {};
  for (const row of data || []) result[row.cle] = row.valeur;
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { cle, valeur } = body;
  if (!cle || valeur === undefined) {
    return NextResponse.json({ error: 'cle et valeur requis' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('bac_config_textes')
    .upsert({ cle, valeur, updated_at: new Date().toISOString() }, { onConflict: 'cle' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
