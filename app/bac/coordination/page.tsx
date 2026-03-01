import { getBacSession } from '../../../lib/bac/auth';
import { redirect } from 'next/navigation';
import CoordinateurInterface from '../../../components/bac/CoordinateurInterface';

export const metadata = { title: 'BAC — Coordination', robots: 'noindex, nofollow' };

export default async function CoordinationPage() {
  const session = await getBacSession();
  if (!session || session.profil_type !== 'admin') {
    redirect('/animation/admin');
  }
  return <CoordinateurInterface isAdmin />;
}
