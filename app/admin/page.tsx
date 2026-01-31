import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import AdminLogin from '../../components/AdminLogin/AdminLogin';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('admin');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Admin' };
}

export default function AdminPage() {
  return (
    <section>
      <JsonLdScript slug="admin" />
      <PageHeader page="admin" title="Admin" subtitle="Panneau d'administration" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <p style={{ color: 'var(--muted)' }}>Administration</p>
        <AdminLogin />
      </div>
    </section>
  );
}
