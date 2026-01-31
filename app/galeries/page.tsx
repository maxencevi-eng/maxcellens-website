import type { Metadata } from 'next';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import GalleriesPage from '../galleries/page';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('galeries');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Galeries', description: 'Galeries — Maxcellens' };
}

export default function GaleriesPageRoute() {
  return <GalleriesPage />;
}
