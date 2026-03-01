// app/bac/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin, requireBacProfil, getBacSession } from '../../../../lib/bac/auth';

export async function GET() {
  // Allow all authenticated BAC users to fetch sessions
  const auth = await getBacSession();
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('bac_sessions')
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For groupe-acteur and technique: filter to only sessions that include their group
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
  const auth = await getBacSession();
  if (!auth || (auth.profil_type !== 'admin' && auth.profil_type !== 'technique')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

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

export async function DELETE(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  // Delete related data first
  await supabaseAdmin.from('bac_saisies_acteurs').delete().eq('session_id', id);
  await supabaseAdmin.from('bac_choix_scenes').delete().eq('session_id', id);
  await supabaseAdmin.from('bac_casting_groupes').delete().eq('session_id', id);

  const { error } = await supabaseAdmin.from('bac_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}