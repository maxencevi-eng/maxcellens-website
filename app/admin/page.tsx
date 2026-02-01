import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import AdminLogin from '../../components/AdminLogin/AdminLogin';
import AdminTitleBlock from '../../components/AdminTitleBlock/AdminTitleBlock';
import AdminNav from '../../components/AdminNav/AdminNav';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('admin');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Admin' };
}

const TITLE_STYLE_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5', 'p'] as const;
type AdminTitleStyle = typeof TITLE_STYLE_KEYS[number];

export default async function AdminPage() {
  let adminTitle = 'Administration';
  let adminTitleStyle: AdminTitleStyle = 'h1';
  let adminTitleFontSize: number | null = null;
  try {
    if (supabaseAdmin) {
      const { data: titleRow } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'admin_page_title').maybeSingle();
      if (titleRow?.value && typeof titleRow.value === 'string') adminTitle = titleRow.value;
      const { data: styleRow } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'admin_page_title_style').maybeSingle();
      if (styleRow?.value && typeof styleRow.value === 'string' && TITLE_STYLE_KEYS.includes(styleRow.value as AdminTitleStyle)) {
        adminTitleStyle = styleRow.value as AdminTitleStyle;
      }
      const { data: fsRow } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'admin_page_title_font_size').maybeSingle();
      if (fsRow?.value != null) {
        const n = Number(fsRow.value);
        if (!isNaN(n) && n >= 8 && n <= 72) adminTitleFontSize = n;
      }
    }
  } catch (_) {}

  return (
    <section>
      <JsonLdScript slug="admin" />
      <PageHeader page="admin" title="Admin" subtitle="Panneau d'administration" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <AdminTitleBlock initialTitle={adminTitle} initialTitleStyle={adminTitleStyle} initialTitleFontSize={adminTitleFontSize} />
        <AdminLogin />
        <AdminNav />
      </div>
    </section>
  );
}
