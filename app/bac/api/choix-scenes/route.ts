// app/bac/api/choix-scenes/route.ts — Scene choices for groups
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getBacSession } from '../../../../lib/bac/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');
  const groupe_slug = searchParams.get('groupe_slug');

  if (!session_id) return NextResponse.json({ error: 'session_id requis' }, { status: 400 });

  let query = supabaseAdmin
    .from('bac_choix_scenes')
    .select('*')
    .eq('session_id', session_id);

  if (groupe_slug) query = query.eq('groupe_slug', groupe_slug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { session_id, groupe_slug, acte, scene_id } = body;

  if (!session_id || !groupe_slug || !acte || !scene_id) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
  }

  // Upsert
  const { data, error } = await supabaseAdmin
    .from('bac_choix_scenes')
    .upsert(
      { session_id, groupe_slug, acte, scene_id, statut: 'choisi' },
      { onConflict: 'session_id,groupe_slug,acte' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Validate all choices (lock them)
export async function PATCH(request: NextRequest) {
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { session_id, groupe_slug } = body;

  const { data, error } = await supabaseAdmin
    .from('bac_choix_scenes')
    .update({ statut: 'valide' })
    .eq('session_id', session_id)
    .eq('groupe_slug', groupe_slug)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Remove a scene choice (acte) for a group
export async function DELETE(request: NextRequest) {
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { session_id, groupe_slug, acte } = body;
  if (!session_id || !groupe_slug || acte == null) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('bac_choix_scenes')
    .delete()
    .eq('session_id', session_id)
    .eq('groupe_slug', groupe_slug)
    .eq('acte', acte);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
