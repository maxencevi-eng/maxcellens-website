// app/bac/api/denouements/route.ts
// Dénouements — scènes de finale scripted (formerly Révélations)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin } from '../../../../lib/bac/auth';

const EMPTY_NOTES = { cadrage: '', rythme: '', silences: '', pieges: '', astuce: '' };

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bac_denouements')
    .select('*')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from('bac_denouements')
    .insert({
      titre: body.titre || 'Nouveau dénouement',
      description: body.description || '',
      ton_principal: body.ton_principal || '',
      ton_secondaire: body.ton_secondaire || '',
      duree_min: body.duree_min ?? 1,
      duree_max: body.duree_max ?? 3,
      fil_rouge: body.fil_rouge || '',
      script_json: body.script_json || [],
      itw_json: body.itw_json || [],
      notes_real_json: body.notes_real_json || EMPTY_NOTES,
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
    .from('bac_denouements')
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

  await supabaseAdmin.from('bac_sessions').update({ denouement_id: null }).eq('denouement_id', id);

  const { error } = await supabaseAdmin.from('bac_denouements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
