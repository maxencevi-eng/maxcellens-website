// app/bac/api/scenes/route.ts — CRUD scènes
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin } from '../../../../lib/bac/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const acte = searchParams.get('acte');
  const groupe = searchParams.get('groupe');

  let query = supabaseAdmin.from('bac_scenes').select('*').order('acte, created_at');

  if (acte) query = query.eq('acte', acte);
  if (groupe) query = query.eq('groupe_acteur', groupe);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from('bac_scenes')
    .insert({
      titre: body.titre || 'Nouvelle scène',
      acte: body.acte || '1',
      ton_principal: body.ton_principal || '',
      ton_secondaire: body.ton_secondaire || '',
      duree_min: body.duree_min || 1,
      duree_max: body.duree_max || 3,
      difficulte: body.difficulte || 1,
      groupes_concernes: body.groupes_concernes || [],
      groupe_acteur: body.groupe_acteur || null,
      nb_intervenants_min: body.nb_intervenants_min || 1,
      nb_intervenants_max: body.nb_intervenants_max || 5,
      fil_rouge: body.fil_rouge || '',
      champ_perso_label: body.champ_perso_label || null,
      champ_perso_exemple: body.champ_perso_exemple || null,
      champ_perso_replique_cible: body.champ_perso_replique_cible || null,
      script_json: body.script_json || [],
      itw_json: body.itw_json || [],
      notes_real_json: body.notes_real_json || { cadrage: '', rythme: '', silences: '', pieges: '', astuce: '' },
      actif: true,
    })
    .select()
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

  const { data, error } = await supabaseAdmin
    .from('bac_scenes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  // Delete related saisies and choix first
  await supabaseAdmin.from('bac_saisies_acteurs').delete().eq('scene_id', id);
  await supabaseAdmin.from('bac_choix_scenes').delete().eq('scene_id', id);

  const { error } = await supabaseAdmin.from('bac_scenes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
