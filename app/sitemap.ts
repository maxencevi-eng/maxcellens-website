import type { MetadataRoute } from 'next';
import { listPublishedSlugs } from '../lib/pages';
import { SITE_URL, canonicalForSlug } from '../lib/siteUrl';

/**
 * Le sitemap était généré une fois à la compilation : une page publiée depuis
 * l'administration n'y apparaissait qu'au déploiement suivant, donc n'était
 * jamais découverte par Google entre-temps. On le régénère toutes les heures.
 */
export const revalidate = 3600;

const baseUrl = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: canonicalForSlug('home'), lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/corporate`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/evenement`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/portrait`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/realisation`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/animation`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/galeries`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Pages créées depuis l'administration : sans cela une page publiée
  // resterait absente du sitemap et donc mal indexée.
  const dynamicPages = await listPublishedSlugs();
  const dynamicEntries: MetadataRoute.Sitemap = dynamicPages.map((p) => ({
    url: `${baseUrl}/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...dynamicEntries];
}
