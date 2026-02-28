// Bureau à la Carte — Database helpers (server-side only)
import { supabaseAdmin } from '../supabaseAdmin';
import type { 
  BacProfil, BacRole, BacVariant, BacTheme, BacRevelation, 
  BacScene, BacSession, BacCasting, BacChoixScene, BacSaisie 
} from './types';

// ---- Profils ----
export async function getProfils(): Promise<BacProfil[]> {
  const { data } = await supabaseAdmin
    .from('bac_profils_acces')
    .select('*')
    .order('ordre_affichage');
  return data || [];
}

export async function getProfilBySlug(slug: string): Promise<BacProfil | null> {
  const { data } = await supabaseAdmin
    .from('bac_profils_acces')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

export async function getGroupesActeurs(): Promise<BacProfil[]> {
  const { data } = await supabaseAdmin
    .from('bac_profils_acces')
    .select('*')
    .eq('type', 'groupe-acteur')
    .eq('actif', true)
    .order('ordre_affichage');
  return data || [];
}

// ---- Rôles ----
export async function getRoles(): Promise<BacRole[]> {
  const { data } = await supabaseAdmin
    .from('bac_roles')
    .select('*, variants:bac_variants(*)')
    .order('created_at');
  return data || [];
}

export async function getRolesByGroupe(groupeSlug: string): Promise<BacRole[]> {
  const { data } = await supabaseAdmin
    .from('bac_roles')
    .select('*, variants:bac_variants(*)')
    .eq('groupe_slug', groupeSlug)
    .eq('actif', true)
    .order('created_at');
  return data || [];
}

// ---- Thèmes ----
export async function getThemes(): Promise<BacTheme[]> {
  const { data } = await supabaseAdmin
    .from('bac_themes')
    .select('*')
    .order('created_at');
  return data || [];
}

// ---- Révélations ----
export async function getRevelations(): Promise<BacRevelation[]> {
  const { data } = await supabaseAdmin
    .from('bac_revelations')
    .select('*')
    .order('created_at');
  return data || [];
}

// ---- Scènes ----
export async function getScenes(): Promise<BacScene[]> {
  const { data } = await supabaseAdmin
    .from('bac_scenes')
    .select('*')
    .order('acte, created_at');
  return data || [];
}

export async function getSceneById(id: string): Promise<BacScene | null> {
  const { data } = await supabaseAdmin
    .from('bac_scenes')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function getScenesForGroupes(groupes: string[]): Promise<BacScene[]> {
  const { data } = await supabaseAdmin
    .from('bac_scenes')
    .select('*')
    .eq('actif', true)
    .overlaps('groupes_concernes', groupes)
    .order('acte, created_at');
  return data || [];
}

// ---- Sessions ----
export async function getSessions(): Promise<BacSession[]> {
  const { data } = await supabaseAdmin
    .from('bac_sessions')
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getSessionById(id: string): Promise<BacSession | null> {
  const { data } = await supabaseAdmin
    .from('bac_sessions')
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .eq('id', id)
    .single();
  return data;
}

export async function getActiveSession(): Promise<BacSession | null> {
  const { data } = await supabaseAdmin
    .from('bac_sessions')
    .select('*, theme:bac_themes(*), revelation:bac_revelations(*)')
    .in('statut', ['en-preparation', 'en-cours'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

// ---- Casting ----
export async function getCasting(sessionId: string, groupeSlug?: string): Promise<BacCasting[]> {
  let query = supabaseAdmin
    .from('bac_casting_groupes')
    .select('*, role:bac_roles(*, variants:bac_variants(*)), variant:bac_variants(*)')
    .eq('session_id', sessionId)
    .order('ordre');
  
  if (groupeSlug) {
    query = query.eq('groupe_slug', groupeSlug);
  }
  
  const { data } = await query;
  return data || [];
}

// ---- Choix scènes ----
export async function getChoixScenes(sessionId: string, groupeSlug?: string): Promise<BacChoixScene[]> {
  let query = supabaseAdmin
    .from('bac_choix_scenes')
    .select('*')
    .eq('session_id', sessionId);
  
  if (groupeSlug) {
    query = query.eq('groupe_slug', groupeSlug);
  }
  
  const { data } = await query;
  return data || [];
}

// ---- Saisies ----
export async function getSaisies(sessionId: string, groupeSlug?: string, sceneId?: string): Promise<BacSaisie[]> {
  let query = supabaseAdmin
    .from('bac_saisies_acteurs')
    .select('*')
    .eq('session_id', sessionId);
  
  if (groupeSlug) query = query.eq('groupe_slug', groupeSlug);
  if (sceneId) query = query.eq('scene_id', sceneId);
  
  const { data } = await query;
  return data || [];
}

// ---- Snapshot helper ----
export async function createSnapshot(groupesActifs: string[]): Promise<BacScene[]> {
  const scenes = await getScenesForGroupes(groupesActifs);
  return scenes;
}
