import type { Metadata } from 'next';
import { buildPageMetadata } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import GaleriesPageClient from '../../components/GaleriesPageClient/GaleriesPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('galeries', { title: 'Galeries', description: 'Galeries photo et vidéo — Maxcellens' });
}

export default function GaleriesPage() {
  return (
    <>
      <JsonLdScript slug="galeries" />
      <PageHeader page="galleries" title="Galeries" subtitle="Collections de photos" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <GaleriesPageClient />
    </>
  );
}
