// app/bac/api/casting/route.ts — Casting (group actors)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getBacSession } from '../../../../lib/bac/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');
  const groupe_slug = searchParams.get('groupe_slug');

  if (!session_id) return NextResponse.json({ error: 'session_id requis' }, { status: 400 });

  let query = supabaseAdmin
    .from('bac_casting_groupes')
    .select('*, role:bac_roles(*, variants:bac_variants(*)), variant:bac_variants(*)')
    .eq('session_id', session_id)
    .order('ordre');

  if (groupe_slug) query = query.eq('groupe_slug', groupe_slug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { session_id, groupe_slug, members } = body;

  if (!session_id || !groupe_slug || !members) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
  }

  // Delete existing casting for this group/session
  await supabaseAdmin
    .from('bac_casting_groupes')
    .delete()
    .eq('session_id', session_id)
    .eq('groupe_slug', groupe_slug);

  // Insert new members
  const rows = members.map((m: any, i: number) => ({
    session_id,
    groupe_slug,
    prenom: m.prenom,
    role_id: m.role_id || null,
    variant_id: m.variant_id || null,
    ordre: i,
  }));

  const { data, error } = await supabaseAdmin
    .from('bac_casting_groupes')
    .insert(rows)
    .select('*, role:bac_roles(*, variants:bac_variants(*)), variant:bac_variants(*)');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('bac_casting_groupes')
    .update(updates)
    .eq('id', id)
    .select('*, role:bac_roles(*, variants:bac_variants(*)), variant:bac_variants(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
