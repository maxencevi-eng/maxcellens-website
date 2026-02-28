// app/bac/api/profils/route.ts — CRUD profils d'accès
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin, hashPassword } from '../../../../lib/bac/auth';

// GET — list all profils
export async function GET() {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('bac_profils_acces')
    .select('*')
    .order('ordre_affichage');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create a new groupe-acteur profil
export async function POST(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { nom, slug, couleur, password } = body;

  if (!nom || !password) {
    return NextResponse.json({ error: 'Nom et mot de passe requis' }, { status: 400 });
  }

  const finalSlug = slug || nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = await hashPassword(password);

  const { data, error } = await supabaseAdmin
    .from('bac_profils_acces')
    .insert({
      slug: finalSlug,
      nom,
      type: 'groupe-acteur',
      couleur: couleur || '#6366f1',
      mot_de_passe_hash: hash,
      mot_de_passe_clair: password,
      actif: true,
      ordre_affichage: 20,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH — update profil (password, active status, etc.)
export async function PATCH(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { id, password, actif, nom, couleur, nb_scenes_requis } = body;

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const updates: any = {};
  if (password) {
    updates.mot_de_passe_hash = await hashPassword(password);
    updates.mot_de_passe_clair = password;
  }
  if (actif !== undefined) updates.actif = actif;
  if (nom) updates.nom = nom;
  if (couleur) updates.couleur = couleur;
  if (nb_scenes_requis !== undefined) updates.nb_scenes_requis = nb_scenes_requis;

  const { data, error } = await supabaseAdmin
    .from('bac_profils_acces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
