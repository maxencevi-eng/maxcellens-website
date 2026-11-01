/**
 * Données structurées JSON-LD par défaut : un seul graphe reliant l'entreprise
 * (LocalBusiness), la personne et le site. Un graphe unique évite les entités
 * en double ou contradictoires (même @id avec des adresses différentes).
 * Server Component async — récupère les réseaux sociaux pour peupler sameAs.
 */
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { jsonLdHtml } from './jsonLdHtml';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maxcellens.com';
const baseUrl = siteUrl.replace(/\/$/, '');
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

const SOCIAL_KEYS = ['socialInstagram', 'socialFacebook', 'socialYouTube', 'socialTikTok', 'socialLinkedIn'];

async function getSocialUrls(): Promise<string[]> {
  try {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('key, value')
      .in('key', SOCIAL_KEYS);
    if (error || !data) return [];
    return (data as { key: string; value: string }[])
      .map(r => r.value)
      .filter(v => v && v.startsWith('http'));
  } catch {
    return [];
  }
}

export default async function DefaultJsonLd() {
  const sameAs = await getSocialUrls();
  const orgId = `${baseUrl}/#organization`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': orgId,
        name: 'Maxcellens',
        url: baseUrl,
        description: 'Vidéaste et photographe indépendant — vidéo commerciale, événementiel, corporate et portrait. Basé à Clamart (92), disponible en Île-de-France, partout en France et à l’étranger.',
        telephone: '+33674966458',
        email: 'maxcellens@gmail.com',
        ...(supabaseUrl ? {
          logo: `${supabaseUrl}/storage/v1/object/public/site-assets/logos/site-logo.webp`,
          image: `${baseUrl}/opengraph-image`,
        } : {}),
        founder: { '@id': `${baseUrl}/#person` },
        foundingDate: '2020',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Clamart',
          postalCode: '92140',
          addressRegion: 'Île-de-France',
          addressCountry: 'FR',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 48.8003, longitude: 2.2667 },
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Île-de-France' },
          { '@type': 'Country', name: 'France' },
        ],
        knowsAbout: ['Vidéo commerciale', 'Captation événementielle', 'Film institutionnel', 'Photographie corporate', 'Portrait', 'Cadreur'],
        sameAs,
      },
      {
        '@type': 'Person',
        '@id': `${baseUrl}/#person`,
        name: 'Maxence Viozelange',
        jobTitle: 'Vidéaste & Photographe indépendant',
        url: baseUrl,
        worksFor: { '@id': orgId },
        knowsAbout: ['Photographie', 'Vidéographie', 'Prise de vue', 'Post-production', 'Montage vidéo'],
        sameAs,
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: 'Maxcellens',
        url: baseUrl,
        description: 'Portfolio photo & vidéo de Maxcellens : vidéo commerciale, événementiel, corporate et portrait.',
        publisher: { '@id': orgId },
        inLanguage: 'fr-FR',
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
