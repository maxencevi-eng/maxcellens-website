import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import VideoGallery from '../../components/VideoGallery/VideoGallery';
import EditableVideoGallery from '../../components/VideoGallery/EditableVideoGallery';
import VideoIntroEditor from '../../components/VideoIntroEditor/VideoIntroEditor';
import { evenementVideos } from '../../data/videos/evenementVideos';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('evenement');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Évènement' };
}

export default function Evenement() {
  const videos = evenementVideos;
  return (
    <section>
      <JsonLdScript slug="evenement" />
      <PageHeader page="evenement" title="Évènement" subtitle="Captation et reportage d'évènements" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <VideoIntroEditor keyName="evenement_intro" title="" placeholder="" />
      </div>

      <div className="container" style={{ padding: '1.5rem 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Film</h2>
        </div>
        <EditableVideoGallery keyName="videos_evenement" initial={evenementVideos} />
      </div>
    </section>
  );
}
