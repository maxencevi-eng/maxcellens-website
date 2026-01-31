import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import PortraitGallery from '../../components/PortraitGallery/PortraitGallery';
import EditablePortraitGallery from '../../components/PortraitGallery/EditablePortraitGallery';
import PortraitIntroEditor from '../../components/PortraitIntroEditor/PortraitIntroEditor';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
// NOTE: removed default demo images to avoid base images appearing on public pages
// import { portraitPhotos } from '../../data/photos/portraitPhotos';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('portrait');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Portrait' };
}

export default function Portrait() {
  return (
    <section>
      <JsonLdScript slug="portrait" />
      <PageHeader page="portrait" title="Portrait" subtitle="Séances portrait en studio et en extérieur" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0', paddingLeft: 0, paddingRight: 0 }}>
        {/* client editor: non-editable for public, admin can open richtext modal */}
        <PortraitIntroEditor />
      </div> 

      <div className="container" style={{ padding: '1.5rem 0', paddingLeft: 0, paddingRight: 0 }}>
        {/* No demo images here — gallery will remain empty until content is saved in Supabase */}
        <EditablePortraitGallery items={[]} />
      </div>
    </section>
  );
}
