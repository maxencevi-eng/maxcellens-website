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

    let deleted: { id: string }[] = [];

    if (purgeBotsOnly) {
      let sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, user_agent, is_bot');
      if (sessionsRes.error && /column.*user_agent/i.test(sessionsRes.error.message)) {
        return NextResponse.json({ error: 'Colonne user_agent absente. Exécutez la migration analytics (user_agent).' }, { status: 400 });
      }
      if (sessionsRes.error && /column.*is_bot/i.test(sessionsRes.error.message)) {
        sessionsRes = await supabaseAdmin
          .from('analytics_sessions')
          .select('id, session_id, user_agent');
      }
      if (sessionsRes.error) {
        console.error('analytics purge bots fetch error', sessionsRes.error);
        return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
      }
      const allSessions = (sessionsRes.data || []) as { id: string; session_id: string; user_agent?: string | null; is_bot?: boolean | null }[];
      const hasBotColumn = allSessions.length > 0 && 'is_bot' in allSessions[0];
      const isBotSession = (s: typeof allSessions[0]) => (hasBotColumn && s.is_bot === true) || (!hasBotColumn && isLikelyBot(s.user_agent));
      const botSessionIds = allSessions.filter(isBotSession).map((s) => s.session_id);
      const botIds = allSessions.filter(isBotSession).map((s) => s.id);
      if (botSessionIds.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, bots: true });
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
      deleted = delData ?? [];
      return NextResponse.json({ ok: true, deleted: deleted.length, bots: true });
    }

    if (purgeHashes.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .in('ip_hash', purgeHashes)
        .select('id');
      if (error) {
        console.error('analytics purge by hash error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
      return NextResponse.json({ ok: true, deleted: deleted.length, byHash: true });
    }

    if (purgeIps.length > 0) {
      const hashes = purgeIps.map((ip) => hashIp(ip)).filter((h): h is string => !!h);
      if (hashes.length === 0) {
        return NextResponse.json({ error: 'Aucune IP valide' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .in('ip_hash', hashes)
        .select('id');
      if (error) {
        console.error('analytics purge by ip error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
      return NextResponse.json({ ok: true, deleted: deleted.length, byIp: true });
    }

    if (purgeAll) {
      // Purge totale : toutes les sessions (les événements sont supprimés en CASCADE)
      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00.000Z')
        .select('id');
      if (error) {
        console.error('analytics purge all error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
    } else if (olderThan1Month) {
      // Purge tout ce qui est avant le 1er du mois dernier (ex. le 5 fév. → avant le 1er janv.)
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const cutoffStr = cutoff.toISOString();

      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .lt('created_at', cutoffStr)
        .select('id');

      if (error) {
        console.error('analytics purge olderThan1Month error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
    } else {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
      const cutoffStr = cutoff.toISOString();

      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .lt('created_at', cutoffStr)
        .select('id');

      if (error) {
        console.error('analytics purge error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
    }

    const count = deleted?.length ?? 0;
    return NextResponse.json({ ok: true, deleted: count, all: purgeAll, olderThan1Month: olderThan1Month });
  } catch (err: unknown) {
    console.error('analytics purge error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
