import { getBacSession } from '../../../lib/bac/auth';
import TechniqueInterface from '../../../components/bac/TechniqueInterface';
import Connexion from '../../../components/bac/Connexion';

export const metadata = { title: 'BAC — Équipe technique', robots: 'noindex, nofollow' };

export default async function TechniquePage() {
  const session = await getBacSession();
  if (!session || (session.profil_type !== 'technique' && session.profil_type !== 'admin')) {
    return <Connexion profilSlug="technique" />;
  }
  return <TechniqueInterface isAdmin={session.profil_type === 'admin'} />;
}
