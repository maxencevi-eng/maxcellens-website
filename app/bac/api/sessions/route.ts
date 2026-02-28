// app/bac/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin, requireBacProfil } from '../../../../lib/bac/auth';

export async function GET() {
  const session = await requireBacProfil('admin', 'coordinateur');
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();

  // Create snapshot of available scenes for selected groups
  const { data: scenes } = await supabaseAdmin
    .from('bac_scenes')
    .select('*')
    .eq('actif', true)
    .overlaps('groupes_concernes', body.groupes_actifs || []);

  const { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .insert({
      nom_entreprise: body.nom_entreprise,
      date_jour_j: body.date_jour_j || null,
      lieu: body.lieu || '',
      nb_participants: body.nb_participants || 10,
      theme_id: body.theme_id || null,
      revelation_id: body.revelation_id || null,
      groupes_actifs: body.groupes_actifs || [],
      statut: 'en-preparation',
      snapshot_scenes_json: scenes || [],
    })
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  updates.updated_at = new Date().toISOString();

  // If groupes_actifs changed, update snapshot
  if (updates.groupes_actifs) {
    const { data: scenes } = await supabaseAdmin
      .from('bac_scenes')
      .select('*')
      .eq('actif', true)
      .overlaps('groupes_concernes', updates.groupes_actifs);
    updates.snapshot_scenes_json = scenes || [];
  }

  const { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .update(updates)
    .eq('id', id)
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
