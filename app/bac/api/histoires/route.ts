// app/bac/api/histoires/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin } from '../../../../lib/bac/auth';

const HISTOIRE_SELECT = '*, revelation:bac_revelations(*), denouement:bac_denouements(*), scenes:bac_histoire_scenes(*, scene:bac_scenes(*))';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bac_histoires')
    .select(HISTOIRE_SELECT)
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from('bac_histoires')
    .insert({
      titre: body.titre || 'Nouvelle histoire',
      description: body.description || '',
      revelation_id: body.revelation_id || null,
      denouement_id: body.denouement_id || null,
      actif: true,
    })
    .select(HISTOIRE_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { id, scene_ids, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  updates.updated_at = new Date().toISOString();

  // Update metadata
  const { error: updateError } = await supabaseAdmin
    .from('bac_histoires')
    .update(updates)
    .eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Sync scenes pivot if provided
  if (Array.isArray(scene_ids)) {
    await supabaseAdmin.from('bac_histoire_scenes').delete().eq('histoire_id', id);
    if (scene_ids.length > 0) {
      const rows = scene_ids.map((scene_id: string, ordre: number) => ({
        histoire_id: id,
        scene_id,
        ordre,
      }));
      const { error: insertError } = await supabaseAdmin.from('bac_histoire_scenes').insert(rows);
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bac_histoires')
    .select(HISTOIRE_SELECT)
    .eq('id', id)
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

  // Nullify sessions referencing this histoire
  await supabaseAdmin.from('bac_sessions').update({ histoire_id: null }).eq('histoire_id', id);

  // Delete (CASCADE removes bac_histoire_scenes)
  const { error } = await supabaseAdmin.from('bac_histoires').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
