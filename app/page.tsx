import type { Metadata } from 'next';
import { fetchProjects } from '../lib/helpers';
import type { Project } from '../types';
import PageHeader from '../components/PageHeader/PageHeader';
import HomePageClient from '../components/HomeBlocks/HomePageClient';
import { getPageSeo, buildMetadataFromSeo } from '../lib/pageSeo';
import JsonLdScript from '../components/SeoCommandCenter/JsonLdScript';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('home');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return {
    title: 'Portfolio',
    description: 'Portfolio photo & video — sélection de projets.',
  };
}

export default async function HomePage() {
  const projects: Project[] = await fetchProjects();

  return (
    <main>
      <JsonLdScript slug="home" />
      <PageHeader
        page="home"
        title="Maxcellens"
        subtitle="Portfolio photo & vidéo"
        bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80"
      />
      <HomePageClient projects={projects} />
    </main>
  );
}
