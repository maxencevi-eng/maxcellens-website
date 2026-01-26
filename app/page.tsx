import type { Metadata } from 'next';
import { fetchProjects } from '../lib/helpers';
import PhotoMasonry from '../components/PhotoMasonry/PhotoMasonry';
import VideoGallery from '../components/VideoGallery/VideoGallery';
import Clients from '../components/Clients/Clients';
import type { Project } from '../types';
import PageHeader from '../components/PageHeader/PageHeader';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Portfolio photo & video — sélection de projets.',
};

export default async function HomePage() {
  const projects: Project[] = await fetchProjects();

  return (
    <main>
      <PageHeader page="home" title="Maxcellens2" subtitle="Portfolio photo & vidéo" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <section style={{ padding: '2.25rem 0' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Sélection de projets</h2>
          {projects.length === 0 ? (
            <p>Pas encore de projets — connectez Supabase et importez des entrées dans la table <code>projects</code>.</p>
          ) : (
            // @ts-ignore server -> client
            <PhotoMasonry items={projects} />
          )}
        </div>
      </section>

      <section style={{ padding: '3rem 0 0 0', background: '#0b0b0b', color: '#fff' }}>
        <div className="container" style={{ textAlign: 'center', padding: '3rem 0' }}>
          <h2 style={{ color: '#09a0ff', fontSize: '2rem', marginBottom: '0.5rem' }}>Nos <span style={{ color: '#fff' }}>Réalisation</span>s</h2>
          <p style={{ maxWidth: 800, margin: '0.75rem auto 1.75rem', color: '#d5d5d5' }}>Une sélection de vidéos récentes — cliquez pour lancer la lecture. Les liens YouTube peuvent être fournis pour remplacer les vidéos par défaut.</p>
        </div>
        <div className="container">
          <VideoGallery />
        </div>
      </section>

      <Clients />
    </main>
  );
}
