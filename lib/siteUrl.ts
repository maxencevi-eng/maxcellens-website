/**
 * URL publique du site — source unique.
 *
 * `NEXT_PUBLIC_SITE_URL` n'est pas défini dans l'environnement actuel.
 * `app/layout.tsx` avait sa propre valeur de repli, mais pas `lib/pageSeo.ts`,
 * qui retombait sur une chaîne vide : l'URL canonique n'était donc jamais
 * calculée, et aucune page n'émettait de balise `<link rel="canonical">`.
 * Google choisissait alors lui-même une canonique — d'où le motif
 * « Autre page avec balise canonique correcte » dans la Search Console.
 */
const DEFAULT_SITE_URL = 'https://www.maxcellens.com';

/** URL de base, sans slash final. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(
  /\/+$/,
  ''
);

/**
 * URL absolue d'un chemin du site.
 * `absoluteUrl('/')` → `https://…` (sans slash final, pour une canonique stable).
 */
export function absoluteUrl(path: string): string {
  const clean = String(path || '/').replace(/^\/+/, '');
  return clean ? `${SITE_URL}/${clean}` : SITE_URL;
}

/**
 * URL canonique d'une page à partir de son slug SEO.
 * Le slug `home` désigne la racine.
 *
 * Le sitemap dérive de cette même fonction : les deux ne peuvent donc pas
 * diverger. (Google normalise de toute façon `example.com` et `example.com/`
 * vers la même URL — l'enjeu ici est la cohérence du code, pas l'indexation.)
 */
export function canonicalForSlug(slug: string): string {
  if (!slug || slug === 'home') return SITE_URL;
  return absoluteUrl(slug);
}
