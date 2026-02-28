import { redirect } from 'next/navigation';
import { getBacSession } from '../../../lib/bac/auth';
import CoordinateurInterface from '../../../components/bac/CoordinateurInterface';

export const metadata = { title: 'BAC — Coordination', robots: 'noindex, nofollow' };

export default async function CoordinateurPage() {
  const session = await getBacSession();
  if (!session || session.profil_type !== 'coordinateur') redirect('/bac/connexion?profil=coordinateur');
  return <CoordinateurInterface />;
}
