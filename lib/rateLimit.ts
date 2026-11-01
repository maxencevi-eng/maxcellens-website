/**
 * Limiteur de débit en mémoire (fenêtre glissante, par clé).
 *
 * Protection « au mieux » : sur Vercel, une instance de fonction est réutilisée
 * pour de nombreuses requêtes, ce qui suffit à freiner un robot qui enchaîne
 * les tentatives (connexion, formulaire de contact). Il ne remplace pas un
 * compteur en base pour les cas où une limite stricte est indispensable.
 */
const buckets = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Enregistre une tentative ; renvoie `false` si la limite est dépassée. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // Ménage occasionnel pour ne pas garder les clés inactives
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}
