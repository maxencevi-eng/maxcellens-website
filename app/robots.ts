import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/siteUrl';

/**
 * robots.txt généré par Next plutôt que servi depuis `public/`.
 *
 * L'ancien fichier statique portait l'URL du sitemap en dur et pouvait diverger
 * de `NEXT_PUBLIC_SITE_URL`. Il bloquait aussi `/production`, une route qui
 * n'existe plus (elle redirige en 301 vers `/realisation`) : interdire son
 * exploration empêchait Google de suivre la redirection, ce qui explique le
 * motif « Page avec redirection » de la Search Console.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/bac',
          '/api/',
          // Pages légales : volontairement hors index, elles restent
          // accessibles par les liens du pied de page.
          '/mentions-legales',
          '/politique-de-confidentialite',
          // Sous-pages de galeries : hors périmètre d'indexation
          '/galeries/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
