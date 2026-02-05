/**
 * Données structurées JSON-LD par défaut (Organization + WebSite) pour la page d'accueil.
 * Affiché quand page_seo n'a pas de json_ld en base, pour satisfaire les audits SEO (Alyze, Google).
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maxcellens-website.vercel.app';
const baseUrl = siteUrl.replace(/\/$/, '');

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Maxcellens',
  url: baseUrl,
  description: 'Portfolio photo & video — photographie portrait, corporate, événement et production.',
  sameAs: [], // à compléter via admin (réseaux sociaux)
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Maxcellens',
  url: baseUrl,
  description: 'Portfolio photo & video — Maxcellens, photographie portrait, corporate, événement et production.',
  publisher: { '@id': `${baseUrl}/#organization` },
  inLanguage: 'fr-FR',
};

export default function DefaultJsonLd() {
  const orgWithId = { ...organizationLd, '@id': `${baseUrl}/#organization` };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgWithId) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
    </>
  );
}
