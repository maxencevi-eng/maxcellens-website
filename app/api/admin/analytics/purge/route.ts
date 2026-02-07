import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { hashIp } from '../../../../../lib/analytics';
import { isLikelyBot } from '../../../../../lib/bot-detection';

export const dynamic = 'force-dynamic';

const RETENTION_MONTHS = 3;

export async function GET(req: Request) {
  return POST(req);
}

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
 * POST /api/admin/analytics/purge
 * Supprime les sessions analytics de plus de 3 mois (les événements sont supprimés en CASCADE).
 * Protégé par : JWT admin (Authorization: Bearer) OU secret cron (header X-Cron-Secret = CRON_SECRET).
 * Pour planifier : Vercel Cron (vercel.json) ou cron-job.org en appelant cette URL avec le secret.
 */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });

    const url = new URL(req.url);
    const authHeader = req.headers.get('authorization')?.trim();
    const cronSecret =
      req.headers.get('x-cron-secret')?.trim() ||
      url.searchParams.get('secret')?.trim() ||
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '');
    const expectedSecret = process.env.CRON_SECRET;
    const isCron = !!expectedSecret && cronSecret === expectedSecret;
    const user = await getAuthUser(req);

    if (!isCron && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const purgeAll = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';
    const purgeBotsOnly = url.searchParams.get('bots') === '1' || url.searchParams.get('bots') === 'true';
    const olderThan1Month = url.searchParams.get('olderThan') === '1month';
    let purgeIps = url.searchParams.getAll('ip').map((s) => s.trim()).filter(Boolean);
    if (purgeIps.length === 0) {
      const single = url.searchParams.get('ip')?.trim();
      if (single) purgeIps = [single];
    }
    let purgeHashes: string[] = [];
    if (purgeIps.length === 0 && !purgeAll) {
      try {
        const body = (await req.json().catch(() => ({}))) as { ips?: unknown; hashes?: unknown };
        if (Array.isArray(body?.ips)) purgeIps = body.ips.map((x: unknown) => String(x).trim()).filter(Boolean);
        if (Array.isArray(body?.hashes)) purgeHashes = body.hashes.map((x: unknown) => String(x).trim()).filter(Boolean);
      } catch (_) {}
    }

    let deletedRecords: { id: string }[] = [];

    if (purgeBotsOnly) {
      // Purge bots only
      let sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, user_agent, is_bot, human_validated');
      if (sessionsRes.error && /column.*user_agent/i.test(sessionsRes.error.message)) {
        return NextResponse.json({ error: 'Colonne user_agent absente. Exécutez la migration analytics (user_agent).' }, { status: 400 });
      }
      if (sessionsRes.error && /column.*is_bot/i.test(sessionsRes.error.message)) {
        sessionsRes = await supabaseAdmin
          .from('analytics_sessions')
          .select('id, session_id, user_agent, is_bot, human_validated');
      }
      if (sessionsRes.error) {
        console.error('analytics purge bots fetch error', sessionsRes.error);
        return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
      }
      const allSessions = (sessionsRes.data || []) as { id: string; session_id: string; user_agent?: string | null; is_bot?: boolean | null; human_validated?: boolean | null }[];
      const hasBotColumn = allSessions.length > 0 && 'is_bot' in allSessions[0];
      
      // 1. Calculer les durées pour TOUTES les sessions (comme le filtre principal)
      const allSessionIds = allSessions.map((s) => s.session_id);
      const sessionDurations = new Map<string, number>();
      if (allSessionIds.length > 0) {
        const BATCH = 100;
        for (let i = 0; i < allSessionIds.length; i += BATCH) {
          const chunk = allSessionIds.slice(i, i + BATCH);
          
          // Récupérer tous les événements avec timestamps (comme le dashboard)
          const eventsRes = await supabaseAdmin
            .from('analytics_events')
            .select('session_id, created_at, event_type, duration')
            .in('session_id', chunk)
            .order('created_at', { ascending: true });
            
          if (eventsRes.data) {
            // Grouper les événements par session
            const eventsBySession = new Map<string, any[]>();
            for (const e of eventsRes.data) {
              if (!eventsBySession.has(e.session_id)) {
                eventsBySession.set(e.session_id, []);
              }
              eventsBySession.get(e.session_id)!.push(e);
            }
            
            // Calculer la durée de chaque session (comme le dashboard)
            for (const [sessionId, events] of eventsBySession) {
              let duration = 0;
              
              // Utiliser les timestamps (premier -> dernier événement)
              if (events.length >= 2) {
                const firstEvent = new Date(events[0].created_at);
                const lastEvent = new Date(events[events.length - 1].created_at);
                duration = lastEvent.getTime() - firstEvent.getTime();
              }
              
              sessionDurations.set(sessionId, duration);
            }
          }
        }
      }
      
      // 2. Filtrer : bot UA OU durée < 1.5s (ignorer human_validated)
      const isBotByUa = (s: typeof allSessions[0]) => (hasBotColumn && s.is_bot === true) || (!hasBotColumn && isLikelyBot(s.user_agent));
      
      const sessionsToDelete = allSessions.filter((s) => {
        const duration = sessionDurations.get(s.session_id) || 0;
        const isShortDuration = duration < 1500; // 1.5s comme le filtre principal
        const isBot = isBotByUa(s);
        
        // Supprimer si bot OU durée courte (même logique que le toggle)
        return isBot || isShortDuration;
      });
      
      const botSessionIds = sessionsToDelete.map((s) => s.session_id);
      const botIds = sessionsToDelete.map((s) => s.id);
      
      if (botSessionIds.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, bots: true, message: 'Aucun bot ou session courte (< 1.5s) trouvé.' });
      }
      const BATCH = 100;
      for (let i = 0; i < botSessionIds.length; i += BATCH) {
        const chunk = botSessionIds.slice(i, i + BATCH);
        await supabaseAdmin.from('analytics_events').delete().in('session_id', chunk);
      }
      const { data: delData, error: delError } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .in('id', botIds)
        .select('id');
      if (delError) {
        console.error('analytics purge bots delete error', delError);
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: delData.length, bots: true });
    }

    if (purgeHashes.length > 0) {
      const sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id')
        .in('hash', purgeHashes);
      if (sessionsRes.error) {
        console.error('analytics purge hashes fetch error', sessionsRes.error);
        return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
      }
      const sessionsToDelete = (sessionsRes.data || []) as { id: string; session_id: string }[];
      const sessionIds = sessionsToDelete.map((s) => s.session_id);
      const ids = sessionsToDelete.map((s) => s.id);
      if (sessionIds.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, message: 'Aucune session trouvée.' });
      }
      const BATCH = 100;
      for (let i = 0; i < sessionIds.length; i += BATCH) {
        const chunk = sessionIds.slice(i, i + BATCH);
        await supabaseAdmin.from('analytics_events').delete().in('session_id', chunk);
      }
      const { data: delData, error: delError } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .in('id', ids)
        .select('id');
      if (delError) {
        console.error('analytics purge hashes delete error', delError);
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: delData.length });
    }

    if (purgeIps.length > 0) {
      const sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id')
        .in('ip', purgeIps);
      if (sessionsRes.error) {
        console.error('analytics purge ips fetch error', sessionsRes.error);
        return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
      }
      const sessionsToDelete = (sessionsRes.data || []) as { id: string; session_id: string }[];
      const sessionIds = sessionsToDelete.map((s) => s.session_id);
      const ids = sessionsToDelete.map((s) => s.id);
      if (sessionIds.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, message: 'Aucune session trouvée.' });
      }
      const BATCH = 100;
      for (let i = 0; i < sessionIds.length; i += BATCH) {
        const chunk = sessionIds.slice(i, i + BATCH);
        await supabaseAdmin.from('analytics_events').delete().in('session_id', chunk);
      }
      const { data: delData, error: delError } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .in('id', ids)
        .select('id');
      if (delError) {
        console.error('analytics purge ips delete error', delError);
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: delData.length });
    }

    if (purgeAll) {
      const sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id');
      if (sessionsRes.error) {
        console.error('analytics purge all fetch error', sessionsRes.error);
        return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
      }
      const sessionsToDelete = (sessionsRes.data || []) as { id: string; session_id: string }[];
      const sessionIds = sessionsToDelete.map((s) => s.session_id);
      const ids = sessionsToDelete.map((s) => s.id);
      if (sessionIds.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, message: 'Aucune session trouvée.' });
      }
      const BATCH = 100;
      for (let i = 0; i < sessionIds.length; i += BATCH) {
        const chunk = sessionIds.slice(i, i + BATCH);
        await supabaseAdmin.from('analytics_events').delete().in('session_id', chunk);
      }
      const { data: delData, error: delError } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .in('id', ids)
        .select('id');
      if (delError) {
        console.error('analytics purge all delete error', delError);
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: delData.length });
    }

    // Purge par défaut (3 mois)
    const sessionsRes = await supabaseAdmin
      .from('analytics_sessions')
      .select('id, session_id, created_at')
      .lt('created_at', new Date(Date.now() - RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000));
    if (sessionsRes.error) {
      console.error('analytics purge default fetch error', sessionsRes.error);
      return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
    }
    const sessionsToDelete = (sessionsRes.data || []) as { id: string; session_id: string; created_at: string }[];
    const sessionIds = sessionsToDelete.map((s) => s.session_id);
    const ids = sessionsToDelete.map((s) => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0, message: 'Aucune session trouvée.' });
    }
    const BATCH = 100;
    for (let i = 0; i < sessionIds.length; i += BATCH) {
      const chunk = sessionIds.slice(i, i + BATCH);
      await supabaseAdmin.from('analytics_events').delete().in('session_id', chunk);
    }
    const { data: delData, error: delError } = await supabaseAdmin
      .from('analytics_sessions')
      .delete()
      .in('id', ids)
      .select('id');
    if (delError) {
      console.error('analytics purge default delete error', delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: delData.length });
  } catch (err: unknown) {
    console.error('analytics purge error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
