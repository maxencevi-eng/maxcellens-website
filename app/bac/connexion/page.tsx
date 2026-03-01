import { redirect } from 'next/navigation';

// The generic /connexion page no longer exists.
// Each profil has its own inline login at /animation/{slug}.
export default function ConnexionPage() {
  redirect('/animation/admin');
}
