import type { Metadata } from 'next';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import ProductionPageClient from '../../components/ProductionPageClient/ProductionPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('realisation');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Réalisation' };
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
