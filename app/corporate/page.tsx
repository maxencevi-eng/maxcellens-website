import PageHeader from '../../components/PageHeader/PageHeader';
import VideoGallery from '../../components/VideoGallery/VideoGallery';
import EditableVideoGallery from '../../components/VideoGallery/EditableVideoGallery';
import { corporateVideos } from '../../data/videos/corporateVideos';

export const metadata = { title: 'Corporate' };

export default function Corporate() {
  const videos = [
    'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    'https://www.youtube.com/watch?v=hY7m5jjJ9mM',
    'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
    'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
  ];
  return (
    <section>
      <PageHeader page="corporate" title="Corporate" subtitle="Images professionnelles pour entreprises" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <p style={{ color: 'var(--muted)' }}>Photographie et vidéo corporate pour communication interne et marketing.</p>
      </div>
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Film</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Vidéos corporate et témoignages — présentation verticale pour lecture fluide.</p>
        <EditableVideoGallery keyName="videos_corporate" initial={corporateVideos} />
      </div>
    </section>
  );
}
