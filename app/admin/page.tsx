import type { Metadata } from 'next';
import AdminLogin from '../../components/AdminLogin/AdminLogin';
import AdminTitleBlock from '../../components/AdminTitleBlock/AdminTitleBlock';
import AdminDashboard from '../../components/admin/Dashboard/AdminDashboard';
import AdminGate from '../../components/admin/Dashboard/AdminGate';
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
type AdminTitleStyle = (typeof TITLE_STYLE_KEYS)[number];

export default async function AdminPage() {
  let adminTitle = 'Administration';
  let adminTitleStyle: AdminTitleStyle = 'h1';
  let adminTitleFontSize: number | null = null;

  try {
    if (supabaseAdmin) {
      // Une seule requête pour les trois clés — l'ancienne version en faisait
      // trois en série avant le premier rendu.
      const { data } = await supabaseAdmin
        .from('site_settings')
        .select('key,value')
        .in('key', [
          'admin_page_title',
          'admin_page_title_style',
          'admin_page_title_font_size',
        ] as any);

      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        if (r && typeof r.key === 'string') map[r.key] = String(r.value ?? '');
      });

      if (map.admin_page_title) adminTitle = map.admin_page_title;
      if (TITLE_STYLE_KEYS.includes(map.admin_page_title_style as AdminTitleStyle)) {
        adminTitleStyle = map.admin_page_title_style as AdminTitleStyle;
      }
      const n = Number(map.admin_page_title_font_size);
      if (!Number.isNaN(n) && n >= 8 && n <= 72) adminTitleFontSize = n;
    }
  } catch (_) {
    // Réglages indisponibles : on retombe sur les valeurs par défaut
  }

  return (
    <>
      <JsonLdScript slug="admin" />
      {/* Connecté : tableau de bord. Sinon : formulaire de connexion. */}
      <AdminGate
        signedIn={<AdminDashboard title={adminTitle} />}
        signedOut={
          <>
            <AdminTitleBlock
              initialTitle={adminTitle}
              initialTitleStyle={adminTitleStyle}
              initialTitleFontSize={adminTitleFontSize}
            />
            <AdminLogin />
          </>
        }
      />
    </>
  );
}
