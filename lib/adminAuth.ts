import { supabaseAdmin } from './supabaseAdmin';

/**
 * Vérifie la session admin d'une requête API.
 *
 * Le jeton est envoyé en `Authorization: Bearer …` par le client, qui le tient
 * de `supabase.auth.getSession()`. Ce helper était recopié dans chaque route
 * d'analytics ; les routes du page builder l'importent d'ici.
 */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token || !supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** Vrai si la requête porte une session admin valide. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return (await getAuthUser(req)) !== null;
}
