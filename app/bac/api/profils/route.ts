// app/bac/api/profils/route.ts — CRUD profils d'accès
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireBacAdmin, hashPassword } from '../../../../lib/bac/auth';

// GET — list all profils
// This endpoint is now public so that non-admin users can fetch group
// information (notably colors) for display in the front‑end.  Admin users
// receive every column (including passwords) while other visitors only get
// the fields they actually need.
export async function GET() {
  const isAdmin = await requireBacAdmin();

  // Build base query; select limited columns for non-admins.
  const base = supabaseAdmin.from('bac_profils_acces');
  let query;
  if (isAdmin) {
    query = base.select('*');
  } else {
    // public view: no sensitive data, filter out admin accounts too
    query = base
      .select('id,slug,nom,type,couleur,actif,ordre_affichage,nb_scenes_requis')
      .not('type','eq','admin');
  }

  const { data, error } = await query.order('ordre_affichage');

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
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

// PATCH — update profil (nom, slug, couleur, mot de passe, etc.)
export async function PATCH(request: NextRequest) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { id, password, actif, nom, couleur, nb_scenes_requis, slug } = body;

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  // Récupère d'abord l'ancien slug pour pouvoir comparer et propager proprement
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('bac_profils_acces')
    .select('slug')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message || 'Profil introuvable' }, { status: 404 });
  }
  const oldSlug = existing.slug as string;

  const updates: any = {};
  if (password) {
    updates.mot_de_passe_hash = await hashPassword(password);
    updates.mot_de_passe_clair = password;
  }
  if (actif !== undefined) updates.actif = actif;
  if (nom) updates.nom = nom;
  if (couleur) updates.couleur = couleur;
  if (nb_scenes_requis !== undefined) updates.nb_scenes_requis = nb_scenes_requis;
  if (slug) updates.slug = slug;

  // 1) Met à jour le profil lui-même (slug + autres champs)
  let result = await supabaseAdmin
    .from('bac_profils_acces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (result.error) {
    const coreUpdates: any = {};
    if (updates.mot_de_passe_hash) coreUpdates.mot_de_passe_hash = updates.mot_de_passe_hash;
    if (updates.actif !== undefined) coreUpdates.actif = updates.actif;
    if (updates.nom) coreUpdates.nom = updates.nom;
    if (updates.couleur) coreUpdates.couleur = updates.couleur;
    if (updates.slug) coreUpdates.slug = updates.slug;

    if (Object.keys(coreUpdates).length > 0) {
      result = await supabaseAdmin
        .from('bac_profils_acces')
        .update(coreUpdates)
        .eq('id', id)
        .select()
        .single();
    } else {
      // Only optional columns → just return current row
      result = await supabaseAdmin
        .from('bac_profils_acces')
        .select()
        .eq('id', id)
        .single() as any;
    }
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

  const updatedProfil = result.data;

  // 2) Si le slug a changé, propager dans les autres tables qui référencent le groupe
  if (slug && slug !== oldSlug) {
    const newSlug = slug as string;

    // a) Roles.groupe_slug
    await supabaseAdmin
      .from('bac_roles')
      .update({ groupe_slug: newSlug })
      .eq('groupe_slug', oldSlug);

    // b) Sessions.groupes_actifs (array de slugs)
    const { data: sessions } = await supabaseAdmin
      .from('bac_sessions')
      .select('id, groupes_actifs');

    if (sessions && Array.isArray(sessions)) {
      for (const s of sessions) {
        if (Array.isArray(s.groupes_actifs) && s.groupes_actifs.includes(oldSlug)) {
          const newArray = s.groupes_actifs.map((g: string) => (g === oldSlug ? newSlug : g));
          await supabaseAdmin
            .from('bac_sessions')
            .update({ groupes_actifs: newArray })
            .eq('id', s.id);
        }
      }
    }

    // c) Scenes.groupes_concernes (array de slugs) + script_json / itw_json (role_id = slug)
    const { data: scenes } = await supabaseAdmin
      .from('bac_scenes')
      .select('id, groupes_concernes, script_json, itw_json');
    if (scenes && Array.isArray(scenes)) {
      for (const sc of scenes) {
        let changed = false;
        const payload: any = {};

        if (Array.isArray(sc.groupes_concernes) && sc.groupes_concernes.includes(oldSlug)) {
          payload.groupes_concernes = sc.groupes_concernes.map((g: string) => (g === oldSlug ? newSlug : g));
          changed = true;
        }

        if (Array.isArray(sc.script_json)) {
          const newScript = sc.script_json.map((bloc: any) => {
            if (bloc && bloc.type === 'replique' && bloc.role_id === oldSlug) {
              return { ...bloc, role_id: newSlug };
            }
            return bloc;
          });
          payload.script_json = newScript;
          changed = true;
        }

        if (Array.isArray(sc.itw_json)) {
          const newItw = sc.itw_json.map((q: any) =>
            q && q.role_id === oldSlug ? { ...q, role_id: newSlug } : q
          );
          payload.itw_json = newItw;
          changed = true;
        }

        if (changed) {
          await supabaseAdmin
            .from('bac_scenes')
            .update(payload)
            .eq('id', sc.id);
        }
      }
    }

    // d) Révélations & dénouements : groupes_concernes + script_json / itw_json (role_id = slug)
    const { data: revelations } = await supabaseAdmin
      .from('bac_revelations')
      .select('id, groupes_concernes, script_json, itw_json');
    if (revelations && Array.isArray(revelations)) {
      for (const rev of revelations) {
        let changed = false;
        const payload: any = {};

        if (Array.isArray(rev.groupes_concernes) && rev.groupes_concernes.includes(oldSlug)) {
          payload.groupes_concernes = rev.groupes_concernes.map((g: string) => (g === oldSlug ? newSlug : g));
          changed = true;
        }

        if (Array.isArray(rev.script_json)) {
          const newScript = rev.script_json.map((bloc: any) => {
            if (bloc && bloc.type === 'replique' && bloc.role_id === oldSlug) {
              return { ...bloc, role_id: newSlug };
            }
            return bloc;
          });
          payload.script_json = newScript;
          changed = true;
        }

        if (Array.isArray(rev.itw_json)) {
          const newItw = rev.itw_json.map((q: any) =>
            q && q.role_id === oldSlug ? { ...q, role_id: newSlug } : q
          );
          payload.itw_json = newItw;
          changed = true;
        }

        if (changed) {
          await supabaseAdmin
            .from('bac_revelations')
            .update(payload)
            .eq('id', rev.id);
        }
      }
    }

    const { data: denouements } = await supabaseAdmin
      .from('bac_denouements')
      .select('id, groupes_concernes, script_json, itw_json');
    if (denouements && Array.isArray(denouements)) {
      for (const d of denouements) {
        let changed = false;
        const payload: any = {};

        if (Array.isArray(d.groupes_concernes) && d.groupes_concernes.includes(oldSlug)) {
          payload.groupes_concernes = d.groupes_concernes.map((g: string) => (g === oldSlug ? newSlug : g));
          changed = true;
        }

        if (Array.isArray(d.script_json)) {
          const newScript = d.script_json.map((bloc: any) => {
            if (bloc && bloc.type === 'replique' && bloc.role_id === oldSlug) {
              return { ...bloc, role_id: newSlug };
            }
            return bloc;
          });
          payload.script_json = newScript;
          changed = true;
        }

        if (Array.isArray(d.itw_json)) {
          const newItw = d.itw_json.map((q: any) =>
            q && q.role_id === oldSlug ? { ...q, role_id: newSlug } : q
          );
          payload.itw_json = newItw;
          changed = true;
        }

        if (changed) {
          await supabaseAdmin
            .from('bac_denouements')
            .update(payload)
            .eq('id', d.id);
        }
      }
    }

    // e) Casting, choix de scènes, saisies (groupe_slug)
    await supabaseAdmin
      .from('bac_casting_groupes')
      .update({ groupe_slug: newSlug })
      .eq('groupe_slug', oldSlug);

    await supabaseAdmin
      .from('bac_choix_scenes')
      .update({ groupe_slug: newSlug })
      .eq('groupe_slug', oldSlug);

    await supabaseAdmin
      .from('bac_saisies_acteurs')
      .update({ groupe_slug: newSlug })
      .eq('groupe_slug', oldSlug);
  }

  return NextResponse.json(updatedProfil);
}
