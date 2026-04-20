/**
 * Données structurées JSON-LD par défaut (LocalBusiness + Photographer + WebSite).
 * Server Component async — récupère les réseaux sociaux pour peupler sameAs.
 */
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maxcellens.com';
const baseUrl = siteUrl.replace(/\/$/, '');

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

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': `${baseUrl}/#organization`,
    name: 'Maxcellens',
    url: baseUrl,
    description: 'Vidéaste et photographe indépendant — portrait, corporate, événementiel et réalisation vidéo. Basé à Paris, disponible partout en France.',
    telephone: '+33674966458',
    email: 'maxcellens@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Paris',
      addressRegion: 'Île-de-France',
      addressCountry: 'FR',
    },
    areaServed: {
      '@type': 'Country',
      name: 'France',
    },
    knowsAbout: ['Photographie', 'Vidéographie', 'Corporate', 'Portrait', 'Événementiel', 'Réalisation vidéo'],
    sameAs,
  };

  const photographerLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${baseUrl}/#photographer`,
    name: 'Maxence Viozelange',
    jobTitle: 'Vidéaste & Photographe Indépendant',
    url: baseUrl,
    worksFor: { '@id': `${baseUrl}/#organization` },
    knowsAbout: ['Photographie', 'Vidéographie', 'Prise de vue', 'Post-production', 'Montage vidéo'],
    sameAs,
  };

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Maxcellens',
    url: baseUrl,
    description: 'Portfolio photo & vidéo — Maxcellens, photographie portrait, corporate, événement et production.',
    publisher: { '@id': `${baseUrl}/#organization` },
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/?s={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(photographerLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
    </>
  );
}
