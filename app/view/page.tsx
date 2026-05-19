import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import ViewPage from '../../components/ViewPage/ViewPage';
import type { ViewBlock, ViewProfile } from '../../components/ViewPage/types';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('view');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'View', description: 'Ma vitrine digitale' };
}

async function getViewData(): Promise<{ profile: ViewProfile; blocks: ViewBlock[] }> {
  const defaults = { profile: {} as ViewProfile, blocks: [] as ViewBlock[] };
  if (!supabaseAdmin) return defaults;
  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('key,value')
      .in('key', ['view_profile', 'view_blocks']);
    if (error || !data) return defaults;
    const map: Record<string, string> = {};
    for (const row of data) map[row.key] = row.value;
    let profile: ViewProfile = {};
    let blocks: ViewBlock[] = [];
    try { if (map.view_profile) profile = JSON.parse(map.view_profile); } catch (_) {}
    try { if (map.view_blocks) blocks = JSON.parse(map.view_blocks); } catch (_) {}
    return { profile, blocks };
  } catch (_) {
    return defaults;
  }
}

export default async function ViewPageRoute() {
  const { profile, blocks } = await getViewData();
  return <ViewPage initialProfile={profile} initialBlocks={blocks} />;
}
