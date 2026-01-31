import type { Metadata } from 'next';
import ProductionPage from '../production/page';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';

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
      <ProductionPage />
    </>
  );
}
