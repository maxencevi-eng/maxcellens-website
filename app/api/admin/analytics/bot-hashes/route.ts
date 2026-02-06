import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { isLikelyBot } from '../../../../../lib/bot-detection';

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
 * GET /api/admin/analytics/bot-hashes
 * Retourne la liste des ip_hash des sessions identifiées comme bots (User-Agent).
 * Utilisé pour "Exclure en masse les bots" (fusion avec le filtre d'exclusion).
 */
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let res = await supabaseAdmin
      .from('analytics_sessions')
      .select('ip_hash, user_agent')
      .not('ip_hash', 'is', null);

    if (res.error && /column.*user_agent/i.test(res.error.message)) {
      return NextResponse.json({ hashes: [], message: 'Colonne user_agent absente. Exécutez la migration analytics (user_agent).' });
    }
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

    const rows = (res.data || []) as { ip_hash: string; user_agent?: string | null }[];
    const hashes = [...new Set(
      rows
        .filter((r) => isLikelyBot(r.user_agent))
        .map((r) => r.ip_hash)
        .filter(Boolean)
    )];

    return NextResponse.json({ hashes });
  } catch (err: unknown) {
    console.error('bot-hashes error', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
