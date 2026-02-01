import type { Metadata } from 'next';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import CorporatePageClient from '../../components/CorporatePageClient/CorporatePageClient';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('corporate');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Corporate' };
}

export default function Corporate() {
  return (
    <>
      <JsonLdScript slug="corporate" />
      <PageHeader page="corporate" title="Corporate" subtitle="Images professionnelles pour entreprises" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <CorporatePageClient />
    </>
  );
}
