import type { Metadata } from 'next';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import GaleriesPageClient from '../../components/GaleriesPageClient/GaleriesPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('galeries');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Galeries', description: 'Galeries — Maxcellens' };
}

export default function GalleriesPage() {
  return (
    <>
      <JsonLdScript slug="galeries" />
      <PageHeader page="galleries" title="Galeries" subtitle="Collections de photos" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <GaleriesPageClient />
    </>
  );
}
