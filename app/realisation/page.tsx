import type { Metadata } from 'next';
import { buildPageMetadata } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import ProductionPageClient from '../../components/ProductionPageClient/ProductionPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('realisation', {
    title: 'Réalisation',
    description:
      'Réalisation de vidéos commerciales et de reportages photo sur mesure, en Île-de-France et partout en France.',
  });
}

export default function RealisationPage() {
  return (
    <>
      <JsonLdScript slug="realisation" />
      <PageHeader page="production" title="Réalisation" subtitle="Services de production photo & vidéo sur-mesure." bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <ProductionPageClient />
    </>
  );
}
