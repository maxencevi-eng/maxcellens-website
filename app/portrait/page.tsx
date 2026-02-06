import type { Metadata } from 'next';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import PortraitPageClient from '../../components/PortraitPageClient/PortraitPageClient';

const PORTRAIT_TAB_IDS = ['lifestyle', 'entreprise', 'studio', 'couple'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('portrait');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Portrait' };
}

type SearchParams = Promise<{ tab?: string }>;

export default async function Portrait({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const tab = (params?.tab ?? '').toLowerCase();
  const initialTab = PORTRAIT_TAB_IDS.includes(tab as (typeof PORTRAIT_TAB_IDS)[number])
    ? (tab as (typeof PORTRAIT_TAB_IDS)[number])
    : 'lifestyle';

  return (
    <>
      <JsonLdScript slug="portrait" />
      <PageHeader page="portrait" title="Portrait" subtitle="Séances portrait en studio et en extérieur" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <PortraitPageClient initialTab={initialTab} />
    </>
  );
}
