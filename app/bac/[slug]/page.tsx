// app/bac/[slug]/page.tsx — Friendly group route (/bac/{slug})
import GroupeClient from '../../../components/bac/GroupeInterface';
import { getBacSession } from '../../../lib/bac/auth';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Groupe',
  robots: { index: false, follow: false },
};

export default async function GroupSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getBacSession();

  if (!session) {
    return redirect(`/bac/connexion?profil=${encodeURIComponent(slug)}`);
  }

  // Security: only admin or the matching profil can access this page
  if (session.profil_type !== 'admin' && session.profil_slug !== slug) {
    return redirect(`/bac/connexion?profil=${encodeURIComponent(slug)}`);
  }

  // Fetch group config (nb_scenes_requis)
  let nbScenesRequis = 4;
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
