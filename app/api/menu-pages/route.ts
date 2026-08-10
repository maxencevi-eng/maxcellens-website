import { NextResponse } from 'next/server';
import { listMenuPages } from '../../../lib/pages';

export const dynamic = 'force-dynamic';

/**
 * GET /api/menu-pages
 * Pages publiées et marquées « afficher dans le menu ».
 *
 * Route publique et volontairement minimale : le header l'appelle à chaque
 * chargement, elle ne doit renvoyer que slug et titre.
 */
export async function GET() {
  const pages = await listMenuPages();
  return NextResponse.json({ pages });
}
