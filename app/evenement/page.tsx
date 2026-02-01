import type { Metadata } from 'next';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import PageHeader from '../../components/PageHeader/PageHeader';
import EvenementPageClient from '../../components/EvenementPageClient/EvenementPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('evenement');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Évènement' };
}

export default function Evenement() {
  return (
    <>
      <JsonLdScript slug="evenement" />
      <PageHeader page="evenement" title="Évènement" subtitle="Captation et reportage d'évènements" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <EvenementPageClient />
    </>
  );
}
