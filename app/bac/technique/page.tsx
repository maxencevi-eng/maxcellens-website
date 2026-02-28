import { redirect } from 'next/navigation';
import { getBacSession } from '../../../lib/bac/auth';
import TechniqueInterface from '../../../components/bac/TechniqueInterface';

export const metadata = { title: 'BAC — Équipe technique', robots: 'noindex, nofollow' };

export default async function TechniquePage() {
  const session = await getBacSession();
  if (!session || session.profil_type !== 'technique') redirect('/bac/connexion?profil=technique');
  return <TechniqueInterface />;
}
