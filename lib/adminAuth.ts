import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Liste blanche des comptes admin (ADMIN_EMAILS, séparés par des virgules).
 * Sans elle, tout compte Supabase Auth valide serait admin : les inscriptions
 * sont fermées côté Supabase, mais cette liste reste le garde-fou applicatif.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Vérifie la session admin d'une requête API.
 *
 * Le jeton est envoyé en `Authorization: Bearer …` par le client, qui le tient
 * de `supabase.auth.getSession()` (ajouté automatiquement par
 * `lib/adminFetchAuth.ts` pour les appels `/api/*` de l'admin).
 */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token || !supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(String(data.user.email || '').toLowerCase())) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** Vrai si la requête porte une session admin valide. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return (await getAuthUser(req)) !== null;
}

/**
 * Garde des routes d'écriture : renvoie une réponse d'erreur à retourner telle
 * quelle, ou `null` si la requête est autorisée.
 *
 *   const denied = await requireAdmin(req);
 *   if (denied) return denied;
 */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return null;
}
