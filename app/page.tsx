import type { Metadata } from 'next';
import PageHeader from '../components/PageHeader/PageHeader';
import HomePageClient from '../components/HomeBlocks/HomePageClient';
import { getPageSeo, buildMetadataFromSeo } from '../lib/pageSeo';
import JsonLdScript from '../components/SeoCommandCenter/JsonLdScript';
import DefaultJsonLd from '../components/SeoCommandCenter/DefaultJsonLd';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maxcellens-website.vercel.app';
const baseUrl = siteUrl.replace(/\/$/, '');

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('home');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return {
    title: 'Maxcellens | Vidéaste & Photographe Indépendant — Portrait, Événement, Corporate',
    description: 'Vidéaste et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo. Paris, Île-de-France et France. Missions sur mesure.',
    alternates: { canonical: `${baseUrl}/` },
    openGraph: {
      title: 'Maxcellens | Vidéaste & Photographe Indépendant — Portrait, Événement, Corporate',
      description: 'Vidéaste et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo. Paris et France.',
      url: `${baseUrl}/`,
      type: 'website',
      siteName: 'Maxcellens',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Maxcellens — Vidéaste & Photographe Indépendant' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Maxcellens | Vidéaste & Photographe Indépendant — Portrait, Événement, Corporate',
      description: 'Vidéaste et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo.',
    },
  };
}

export default async function HomePage() {
  return (
    <main>
      <DefaultJsonLd />
      <JsonLdScript slug="home" />
      <PageHeader
        page="home"
        title="Maxcellens"
        subtitle="Portfolio photo & vidéo"
        bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80"
      />
      <HomePageClient />
    </main>
  );
}
