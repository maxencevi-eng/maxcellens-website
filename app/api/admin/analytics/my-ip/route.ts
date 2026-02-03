import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { getClientIp } from '../../../../../lib/analytics';

export const dynamic = 'force-dynamic';

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token || !supabaseAdmin) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/analytics/my-ip
 * Retourne l'IP du client telle que vue par le serveur (celle utilisée pour le hash en collect).
 * Permet de copier-coller dans "Exclure ces IP" pour tester le filtre.
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ip = getClientIp(req.headers);
  return NextResponse.json({ ip: ip || null });
}
