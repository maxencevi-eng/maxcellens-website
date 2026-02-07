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
 * Retourne la liste des ip_hash des sessions identifiées comme bots ou faux humains (User-Agent suspect OU durée < 1s).
 * Utilisé pour "Exclure en masse les bots" (fusion avec le filtre d'exclusion).
 * Filtre : is_bot === true OU User-Agent suspect OU durée < 1 seconde
 */
export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let res = await supabaseAdmin
      .from('analytics_sessions')
      .select('id, session_id, ip_hash, user_agent, is_bot, human_validated');

    if (res.error && /column.*user_agent/i.test(res.error.message)) {
      return NextResponse.json({ hashes: [], message: 'Colonne user_agent absente. Exécutez la migration analytics (user_agent).' });
    }
    if (res.error && /column.*is_bot/i.test(res.error.message)) {
      res = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, ip_hash, user_agent, human_validated');
    }
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

    const rows = (res.data || []) as { id: string; session_id: string; ip_hash: string; user_agent?: string | null; is_bot?: boolean | null; human_validated?: boolean | null }[];
    const hasBotColumn = rows.length > 0 && 'is_bot' in rows[0];
    
    // 1. Récupérer les événements pour calculer les durées de TOUTES les sessions
    const allSessionIds = rows.map((r) => r.session_id);
    const sessionDurations = new Map<string, number>();
    if (allSessionIds.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < allSessionIds.length; i += BATCH) {
        const chunk = allSessionIds.slice(i, i + BATCH);
        const eventsRes = await supabaseAdmin
          .from('analytics_events')
          .select('session_id, event_type, duration')
          .in('session_id', chunk)
          .eq('event_type', 'pageview');
        if (eventsRes.data) {
          for (const e of eventsRes.data) {
            const current = sessionDurations.get(e.session_id) || 0;
            sessionDurations.set(e.session_id, current + (e.duration ?? 0));
          }
        }
      }
    }
    
    // 2. Filtrer comme le toggle : bot UA OU durée < 1s (mais garder humains validés)
    const isBotByUa = (r: typeof rows[0]) => (hasBotColumn && r.is_bot === true) || (!hasBotColumn && isLikelyBot(r.user_agent));
    
    const filteredRows = rows.filter((r) => {
      const duration = sessionDurations.get(r.session_id) || 0;
      const isShortDuration = duration < 1000;
      const isBot = isBotByUa(r);
      const isHumanValidated = r.human_validated === true;
      
      // Exclure si (bot OU short duration) ET pas humain validé
      // C'est la même logique que le toggle d'affichage
      return (isBot || isShortDuration) && !isHumanValidated;
    });
    
    const hashes = [...new Set(
      filteredRows.map((r) => r.ip_hash).filter(Boolean)
    )];

    return NextResponse.json({ hashes, count: hashes.length });
  } catch (err: unknown) {
    console.error('bot-hashes error', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
