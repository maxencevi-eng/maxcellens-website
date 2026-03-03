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

  // 1. Fetch old casting members
  const { data: oldCasting } = await supabaseAdmin
    .from('bac_casting_groupes')
    .select('id')
    .eq('session_id', session_id)
    .eq('groupe_slug', groupe_slug);

  const oldIds: string[] = (oldCasting || []).map((c: any) => c.id);

  // 2. Determine which old members are retained (have a matching id in new members)
  const retainedIds = new Set<string>(
    (members as any[]).map((m: any) => m.id).filter(Boolean)
  );
  const removedIds = oldIds.filter(id => !retainedIds.has(id));

  // 3. Clear acteur_id refs for removed members, then delete them
  if (removedIds.length > 0) {
    await supabaseAdmin
      .from('bac_saisies_acteurs')
      .update({ acteur_id: null })
      .in('acteur_id', removedIds);
    await supabaseAdmin
      .from('bac_casting_groupes')
      .delete()
      .in('id', removedIds);
  }

  // 4. Update existing members in-place (preserves acteur_id refs in saisies)
  const updateOps = (members as any[])
    .filter((m: any) => m.id)
    .map((m: any, _i: number) => {
      const ordre = (members as any[]).indexOf(m);
      return supabaseAdmin
        .from('bac_casting_groupes')
        .update({ prenom: m.prenom, role_id: m.role_id || null, variant_id: m.variant_id || null, ordre })
        .eq('id', m.id);
    });
  if (updateOps.length > 0) await Promise.all(updateOps);

  // 5. Insert new members (those without an id)
  const newMemberRows = (members as any[])
    .filter((m: any) => !m.id)
    .map((m: any) => ({
      session_id,
      groupe_slug,
      prenom: m.prenom,
      role_id: m.role_id || null,
      variant_id: m.variant_id || null,
      ordre: (members as any[]).indexOf(m),
    }));
  if (newMemberRows.length > 0) {
    await supabaseAdmin.from('bac_casting_groupes').insert(newMemberRows);
  }

  // 6. Return fresh casting
  const { data, error } = await supabaseAdmin
    .from('bac_casting_groupes')
    .select('*, role:bac_roles(*, variants:bac_variants(*)), variant:bac_variants(*)')
    .eq('session_id', session_id)
    .eq('groupe_slug', groupe_slug)
    .order('ordre');

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
