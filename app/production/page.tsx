import PageHeader from '../../components/PageHeader/PageHeader';
import VideoGallery from '../../components/VideoGallery/VideoGallery';
import EditableVideoGallery from '../../components/VideoGallery/EditableVideoGallery';
import VideoIntroEditor from '../../components/VideoIntroEditor/VideoIntroEditor';
import { productionVideos } from '../../data/videos/productionVideos';

export const metadata = { title: 'Réalisation' };

export default function Production() {
  return (
    <section>
      <PageHeader page="production" title="Réalisation" subtitle="Services de production photo & vidéo sur-mesure." bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <VideoIntroEditor keyName="production_intro" title="" placeholder="" />
      </div>

      <div className="container" style={{ padding: '1.5rem 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Film</h2>
        </div>
        <EditableVideoGallery keyName="videos_production" initial={productionVideos} />
      </div>
    </section>
  );
}
