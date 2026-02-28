// app/bac/api/roles/route.ts — CRUD rôles + variants
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin } from '../../../../lib/bac/auth';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bac_roles')
    .select('*, variants:bac_variants(*), groupe:bac_profils_acces(nom, couleur)')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { nom, groupe_slug, description, couleur, variants } = body;

  if (!nom || !groupe_slug) {
    return NextResponse.json({ error: 'Nom et groupe requis' }, { status: 400 });
  }

  // Create role
  const { data: role, error: roleError } = await supabaseAdmin
    .from('bac_roles')
    .insert({ nom, groupe_slug, description: description || '', couleur: couleur || '#6366f1', actif: true })
    .select()
    .single();

  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });

  // Create variants
  if (variants && Array.isArray(variants) && variants.length === 3) {
    const variantRows = variants.map((v: any, i: number) => ({
      role_id: role.id,
      lettre: ['A', 'B', 'C'][i],
      nom: v.nom || `Variant ${['A', 'B', 'C'][i]}`,
      description: v.description || '',
      emoji: v.emoji || '🎭',
    }));

    await supabaseAdmin.from('bac_variants').insert(variantRows);
  }

  // Return with variants
  const { data } = await supabaseAdmin
    .from('bac_roles')
    .select('*, variants:bac_variants(*)')
    .eq('id', role.id)
    .single();

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { id, nom, description, couleur, actif, variants } = body;

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const updates: any = {};
  if (nom !== undefined) updates.nom = nom;
  if (description !== undefined) updates.description = description;
  if (couleur !== undefined) updates.couleur = couleur;
  if (actif !== undefined) updates.actif = actif;

  await supabaseAdmin.from('bac_roles').update(updates).eq('id', id);

  // Update variants if provided
  if (variants && Array.isArray(variants)) {
    for (const v of variants) {
      if (v.id) {
        await supabaseAdmin.from('bac_variants').update({
          nom: v.nom,
          description: v.description,
          emoji: v.emoji,
        }).eq('id', v.id);
      }
    }
  }

  const { data } = await supabaseAdmin
    .from('bac_roles')
    .select('*, variants:bac_variants(*)')
    .eq('id', id)
    .single();

  return NextResponse.json(data);
}
