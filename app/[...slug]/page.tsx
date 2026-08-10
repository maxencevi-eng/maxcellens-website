import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageHeader from '../../components/PageHeader/PageHeader';
import DynamicPageClient from '../../components/PageBuilder/DynamicPageClient';
import DraftPreviewGate from '../../components/PageBuilder/DraftPreviewGate';
import { getPageBySlug, listPages } from '../../lib/pages';
import { absoluteUrl } from '../../lib/siteUrl';
import type { SitePage } from '../../components/PageBuilder/pageTypes';

/**
 * Route attrape-tout des pages créées depuis l'administration.
 *
 * Next.js donne la priorité aux segments statiques : /contact, /portrait et
 * les autres pages historiques continuent d'être servies par leurs fichiers
 * dédiés. Cette route ne reçoit que ce qui ne correspond à rien d'autre.
 *
 * `dynamic = 'force-dynamic'` : une page peut être publiée ou dépubliée à tout
 * moment depuis l'admin, et un brouillon ne doit jamais être mis en cache.
 */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string[] }> };

function slugFromParams(parts: string[]): string {
  return (parts || []).join('/');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slugFromParams(slug);
  const page = await getPageBySlug(path);

  // Page absente ou non publiée : on demande explicitement la désindexation
  // plutôt que de laisser Google décider face à une 404 molle.
  if (!page) return { robots: { index: false, follow: false } };

  const seo = page.seo || {};
  const canonical = absoluteUrl(page.slug);

  return {
    title: seo.title || page.title,
    description: seo.description || undefined,
    // Canonique systématique : sans elle, une page créée depuis l'admin serait
    // exposée aux mêmes ambiguïtés d'indexation que les pages historiques.
    alternates: { canonical },
    robots: seo.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: seo.title || page.title,
      description: seo.description || undefined,
      url: canonical,
      type: 'website',
      siteName: 'Maxcellens',
      images: seo.image ? [{ url: seo.image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title || page.title,
      description: seo.description || undefined,
      images: seo.image ? [seo.image] : undefined,
    },
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const path = slugFromParams(slug);

  // Rendu public : seules les pages publiées.
  const published = await getPageBySlug(path);

  if (!published) {
    // La page existe peut-être en brouillon : on ne le révèle qu'à un admin,
    // vérifié côté client (le rendu serveur ne connaît pas la session Supabase
    // de l'utilisateur, stockée côté navigateur).
    const draft = await getPageBySlug(path, { includeDrafts: true });
    if (!draft) notFound();

    const options = await buildPageOptions();
    return (
      <DraftPreviewGate>
        <DynamicPageHeader page={draft} />
        <DynamicPageClient page={draft} pageOptions={options} />
      </DraftPreviewGate>
    );
  }

  const options = await buildPageOptions();

  return (
    <>
      <DynamicPageHeader page={published} />
      <DynamicPageClient page={published} pageOptions={options} />
    </>
  );
}

/**
 * Bandeau d'en-tête d'une page créée depuis l'administration.
 *
 * Rendu par défaut, comme sur les pages historiques : `PageHeader` lit
 * l'image, le mode et le point de focus dans la table `headers` via la clé
 * `page-<slug>`, et expose l'éditeur de hero à l'admin. Chaque page a donc son
 * propre en-tête, personnalisable individuellement.
 *
 * `header.enabled === false` permet malgré tout de le retirer sur une page
 * précise.
 */
async function DynamicPageHeader({ page }: { page: SitePage }) {
  if (page.header?.enabled === false) return null;
  return (
    <PageHeader
      page={`page-${page.slug}`}
      title={page.header?.title || page.title}
      subtitle={page.header?.subtitle}
    />
  );
}

/** Cibles de lien proposées dans l'éditeur du bloc Bouton. */
async function buildPageOptions() {
  const dynamicPages = await listPages({ includeDrafts: true });
  return [
    { value: '/', label: 'Accueil' },
    { value: '/realisation', label: 'Réalisation' },
    { value: '/evenement', label: 'Évènement' },
    { value: '/corporate', label: 'Corporate' },
    { value: '/portrait', label: 'Portrait' },
    { value: '/animation', label: 'Animation' },
    { value: '/galeries', label: 'Galeries' },
    { value: '/contact', label: 'Contact' },
    ...dynamicPages.map((p) => ({ value: `/${p.slug}`, label: p.title })),
  ];
}
