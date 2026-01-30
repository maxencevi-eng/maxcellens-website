import PageHeader from '../../components/PageHeader/PageHeader';
import VideoGallery from '../../components/VideoGallery/VideoGallery';
import EditableVideoGallery from '../../components/VideoGallery/EditableVideoGallery';
import { evenementVideos } from '../../data/videos/evenementVideos';

export const metadata = { title: 'Évènement' };

export default function Evenement() {
  const videos = evenementVideos;
  return (
    <section>
      <PageHeader page="evenement" title="Évènement" subtitle="Captation et reportage d'évènements" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <p style={{ color: 'var(--muted)' }}>Couverture photo et vidéo pour événements privés et professionnels.</p>
      </div>
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Film</h2>
        <EditableVideoGallery keyName="videos_evenement" initial={evenementVideos} />
      </div>
    </section>
  );
}
