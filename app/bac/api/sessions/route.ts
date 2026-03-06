// app/bac/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin, getBacSession } from '../../../../lib/bac/auth';

const SESSION_SELECT = '*, histoire:bac_histoires(*, revelation:bac_revelations(*), denouement:bac_denouements(*), scenes:bac_histoire_scenes(*, scene:bac_scenes(*)))';

export async function GET() {
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .select(SESSION_SELECT)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (auth.profil_type === 'groupe-acteur') {
    const filtered = (data || []).filter((s: any) =>
      s.groupes_actifs?.includes(auth.profil_slug)
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();

  // Prépare le payload d'insertion, avec min/max scènes optionnels
  const insertPayload: any = {
    nom_entreprise: body.nom_entreprise,
    date_jour_j: body.date_jour_j || null,
    lieu: body.lieu || '',
    nb_participants: body.nb_participants || 10,
    histoire_id: body.histoire_id || null,
    groupes_actifs: body.groupes_actifs || [],
    statut: 'en-preparation',
  };

  if (typeof body.min_scenes === 'number') insertPayload.min_scenes = body.min_scenes;
  if (typeof body.max_scenes === 'number') insertPayload.max_scenes = body.max_scenes;

  // Snapshot of chooseable scenes (histoire scenes loaded via join, not snapshot)
  const { data: scenes } = await supabaseAdmin
    .from('bac_scenes')
    .select('*')
    .eq('actif', true)
    .overlaps('groupes_concernes', body.groupes_actifs || []);
  insertPayload.snapshot_scenes_json = scenes || [];

  let { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .insert(insertPayload)
    .select(SESSION_SELECT)
    .single();

  // Si la colonne min_scenes / max_scenes n'existe pas encore (migration non appliquée),
  // on réessaie sans ces champs pour éviter de tout casser en dev.
  if (error && error.message && error.message.includes('column') && error.message.includes('min_scenes')) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete insertPayload.min_scenes;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete insertPayload.max_scenes;

    const retry = await supabaseAdmin
      .from('bac_sessions')
      .insert(insertPayload)
      .select(SESSION_SELECT)
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getBacSession();
  if (!auth || (auth.profil_type !== 'admin' && auth.profil_type !== 'technique')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  updates.updated_at = new Date().toISOString();

  // Ne pousse min/max scènes que si ce sont bien des nombres
  if (typeof updates.min_scenes !== 'number') delete (updates as any).min_scenes;
  if (typeof updates.max_scenes !== 'number') delete (updates as any).max_scenes;

  if (updates.groupes_actifs) {
    const { data: scenes } = await supabaseAdmin
      .from('bac_scenes')
      .select('*')
      .eq('actif', true)
      .overlaps('groupes_concernes', updates.groupes_actifs);
    updates.snapshot_scenes_json = scenes || [];
  }

  let { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .update(updates)
    .eq('id', id)
    .select(SESSION_SELECT)
    .single();

  // Fallback si les colonnes min_scenes / max_scenes n'existent pas
  if (error && error.message && error.message.includes('column') && error.message.includes('min_scenes')) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (updates as any).min_scenes;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (updates as any).max_scenes;

    const retry = await supabaseAdmin
      .from('bac_sessions')
      .update(updates)
      .eq('id', id)
      .select(SESSION_SELECT)
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  await supabaseAdmin.from('bac_saisies_acteurs').delete().eq('session_id', id);
  await supabaseAdmin.from('bac_choix_scenes').delete().eq('session_id', id);
  await supabaseAdmin.from('bac_casting_groupes').delete().eq('session_id', id);

  const { error } = await supabaseAdmin.from('bac_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
