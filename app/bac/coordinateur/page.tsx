import { getBacSession } from '../../../lib/bac/auth';
import CoordinateurInterface from '../../../components/bac/CoordinateurInterface';
import Connexion from '../../../components/bac/Connexion';

export const metadata = { title: 'BAC — Coordination', robots: 'noindex, nofollow' };

export default async function CoordinateurPage() {
  const session = await getBacSession();
  if (!session || (session.profil_type !== 'coordinateur' && session.profil_type !== 'admin')) {
    return <Connexion profilSlug="coordinateur" />;
  }
  return <CoordinateurInterface />;
}
