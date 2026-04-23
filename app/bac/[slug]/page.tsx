// app/bac/[slug]/page.tsx — Group route (/animation/{slug})
import GroupeClient from '../../../components/bac/GroupeInterface';
import Connexion from '../../../components/bac/Connexion';
import { getBacSession } from '../../../lib/bac/auth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Groupe',
  robots: { index: false, follow: false },
};

export default async function GroupSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getBacSession();

  // Not logged in or wrong profil → show inline login for this slug
  if (!session || (session.profil_type !== 'admin' && session.profil_slug !== slug)) {
    return <Connexion profilSlug={slug} />;
  }

  // Fetch group config (nb_scenes_requis)
  let nbScenesRequis = 3;
  try {
    const { data } = await supabaseAdmin
      .from('bac_profils_acces')
      .select('nb_scenes_requis')
      .eq('slug', slug)
      .single();
    if (data?.nb_scenes_requis != null) nbScenesRequis = data.nb_scenes_requis;
  } catch { }

  return <GroupeClient slug={slug} nbScenesRequis={nbScenesRequis} />;
}
