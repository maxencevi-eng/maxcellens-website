import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { parseIpFilter, hashedIpList, hashIp, getClientIp } from '../../../../lib/analytics';
import { isLikelyBot } from '../../../../lib/bot-detection';

export const dynamic = 'force-dynamic';

function getDateRange(period: string, days: number): { since: Date; until: Date } {
  const now = new Date();
  const until = new Date(now);
  until.setHours(23, 59, 59, 999);
  if (period === 'current_month') {
    return { since: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), until };
  }
  if (period === 'last_month') {
    return {
      since: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
      until: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  const since = new Date(now);
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return { since, until };
}

function categorizeSource(referrer: string | null | undefined): string {
  if (!referrer || referrer.trim() === '') return 'Direct';
  const r = referrer.toLowerCase();
  if (r.includes('instagram.com') || r.includes('l.instagram.com')) return 'Instagram';
  if (r.includes('facebook.com') || r.includes('fb.com')) return 'Facebook';
  if (r.includes('youtube.com') || r.includes('youtu.be')) return 'YouTube';
  if (r.includes('tiktok.com')) return 'TikTok';
  if (r.includes('linkedin.com')) return 'LinkedIn';
  if (r.includes('twitter.com') || r.includes('t.co') || r.includes('x.com')) return 'Twitter/X';
  try {
    const u = new URL(referrer.startsWith('http') ? referrer : `https://${referrer}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return referrer.slice(0, 40);
  }
}

async function getAuthUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token || !supabaseAdmin) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    return (error || !user) ? null : user;
  } catch { return null; }
}

export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || 'days';
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const { since, until } = getDateRange(period, days);
  const sinceStr = since.toISOString();
  const untilStr = until.toISOString();

  // Read settings in parallel: bot exclusion + IP filter
  const [{ data: excludeBotsRow }, { data: filterRow }] = await Promise.all([
    supabaseAdmin.from('site_settings').select('value').eq('key', 'analytics_exclude_bots').maybeSingle(),
    supabaseAdmin.from('site_settings').select('value').eq('key', 'analytics_ip_filter').maybeSingle(),
  ]);

  const excludeBots = (() => {
    const v = (excludeBotsRow as any)?.value;
    if (v === 'false' || v === '0') return false;
    return true; // default on
  })();

  const filter = parseIpFilter((filterRow as any)?.value);
  const adminIp = getClientIp(new Headers(req.headers as any));
  const adminIpHash = hashIp(adminIp);
  const excludeHashes = new Set<string>([
    ...(filter.exclude?.length ? hashedIpList(filter.exclude) : []),
    ...(filter.excludeHashes?.length ? filter.excludeHashes : []),
    ...(adminIpHash ? [adminIpHash] : []),
  ].filter(Boolean) as string[]);

  // Pageview events on /view
  const eventsRes = await supabaseAdmin
    .from('analytics_events')
    .select('session_id, created_at, path')
    .eq('event_type', 'pageview')
    .or('path.eq./view,path.eq./view/')
    .gte('created_at', sinceStr)
    .lte('created_at', untilStr);

  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });

  const viewEvents = eventsRes.data || [];
  const allSessionIds = [...new Set(viewEvents.map((e) => e.session_id))];

  const emptyResponse = () => {
    const dailyVisits: { date: string; count: number }[] = [];
    const cur = new Date(since); cur.setHours(0, 0, 0, 0);
    while (cur <= until) { dailyVisits.push({ date: cur.toISOString().slice(0, 10), count: 0 }); cur.setDate(cur.getDate() + 1); }
    return NextResponse.json({ totalViews: 0, uniqueVisitors: 0, directVisits: 0, bySource: [], dailyVisits, visitors: [] });
  };

  if (allSessionIds.length === 0) return emptyResponse();

  // Fetch sessions with full details (batched)
  type SessionRow = {
    session_id: string; ip_hash: string | null; ip?: string | null;
    referrer?: string | null; country?: string | null; city?: string | null;
    created_at: string; user_agent?: string | null; is_bot?: boolean | null; human_validated?: boolean | null;
  };
  const BATCH = 200;
  let sessions: SessionRow[] = [];
  let useBotColumns = true;

  for (let i = 0; i < allSessionIds.length; i += BATCH) {
    const chunk = allSessionIds.slice(i, i + BATCH);
    let q = supabaseAdmin.from('analytics_sessions')
      .select('session_id, ip_hash, ip, referrer, country, city, created_at, user_agent, is_bot, human_validated')
      .in('session_id', chunk);
    let res: any;
    try { res = await q.or('is_authenticated.is.null,is_authenticated.eq.false'); }
    catch { res = await q; }

    if (res.error && /column.*(is_bot|human_validated)/i.test(res.error.message)) {
      useBotColumns = false;
      let q2 = supabaseAdmin.from('analytics_sessions')
        .select('session_id, ip_hash, ip, referrer, country, city, created_at, user_agent')
        .in('session_id', chunk);
      try { res = await q2.or('is_authenticated.is.null,is_authenticated.eq.false'); }
      catch { res = await q2; }
    }
    if (res.data) sessions = [...sessions, ...res.data];
  }

  // ── Filter 1: excluded IP hashes (manual + admin IP)
  if (excludeHashes.size > 0) {
    sessions = sessions.filter((s) => !s.ip_hash || !excludeHashes.has(s.ip_hash));
  }

  // ── Filter 2: IP include list (if set)
  const includeHashes = filter.include?.length ? hashedIpList(filter.include) : null;
  if (includeHashes?.length) {
    sessions = sessions.filter((s) => s.ip_hash && includeHashes.includes(s.ip_hash));
  }

  // ── Filter 3: bots — same logic as main dashboard
  if (excludeBots && sessions.length > 0) {
    // Calculate session durations from ALL events for these sessions
    const sessionDurations = new Map<string, number>();
    for (let i = 0; i < allSessionIds.length; i += BATCH) {
      const chunk = allSessionIds.slice(i, i + BATCH);
      const { data: evts } = await supabaseAdmin
        .from('analytics_events')
        .select('session_id, created_at')
        .in('session_id', chunk)
        .order('created_at', { ascending: true });
      if (evts) {
        const bySession = new Map<string, string[]>();
        for (const e of evts) {
          if (!bySession.has(e.session_id)) bySession.set(e.session_id, []);
          bySession.get(e.session_id)!.push(e.created_at);
        }
        for (const [sid, timestamps] of bySession) {
          if (timestamps.length >= 2) {
            const dur = new Date(timestamps[timestamps.length - 1]).getTime() - new Date(timestamps[0]).getTime();
            sessionDurations.set(sid, dur);
          } else {
            sessionDurations.set(sid, 0);
          }
        }
      }
    }

    if (useBotColumns) {
      sessions = sessions.filter((s) => {
        const dur = sessionDurations.get(s.session_id) ?? 0;
        return s.is_bot !== true && dur >= 1500;
      });
    } else {
      sessions = sessions.filter((s) => {
        const dur = sessionDurations.get(s.session_id) ?? 0;
        return !isLikelyBot(s.user_agent) && dur >= 1500;
      });
    }
  }

  // Only keep events whose session passed all filters
  const validIds = new Set(sessions.map((s) => s.session_id));
  const events = viewEvents.filter((e) => validIds.has(e.session_id));

  const sessionMap = new Map(sessions.map((s) => [s.session_id, s]));
  const uniqueIpHashes = new Set<string>();
  const sourceCount = new Map<string, number>();
  const dailyCount = new Map<string, number>();
  let directVisits = 0;

  type VisitorEntry = { ip: string | null; ip_hash: string; country: string; city: string; visits: number; lastVisit: string; source: string };
  const visitorMap = new Map<string, VisitorEntry>();

  for (const event of events) {
    const session = sessionMap.get(event.session_id);
    if (!session) continue;
    if (session.ip_hash) uniqueIpHashes.add(session.ip_hash);
    const source = categorizeSource(session.referrer);
    sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
    if (source === 'Direct') directVisits++;
    const day = event.created_at.slice(0, 10);
    dailyCount.set(day, (dailyCount.get(day) || 0) + 1);

    const key = session.ip_hash ?? session.session_id;
    const existing = visitorMap.get(key);
    if (!existing) {
      visitorMap.set(key, { ip: session.ip ?? null, ip_hash: session.ip_hash ?? key, country: session.country ?? '—', city: session.city ?? '—', visits: 1, lastVisit: event.created_at, source });
    } else {
      existing.visits++;
      if (event.created_at > existing.lastVisit) existing.lastVisit = event.created_at;
    }
  }

  const dailyVisits: { date: string; count: number }[] = [];
  const cur = new Date(since); cur.setHours(0, 0, 0, 0);
  while (cur <= until) {
    const key = cur.toISOString().slice(0, 10);
    dailyVisits.push({ date: key, count: dailyCount.get(key) || 0 });
    cur.setDate(cur.getDate() + 1);
  }

  return NextResponse.json({
    totalViews: events.length,
    uniqueVisitors: uniqueIpHashes.size,
    directVisits,
    bySource: Array.from(sourceCount.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    dailyVisits,
    visitors: Array.from(visitorMap.values()).sort((a, b) => b.visits - a.visits),
  });
}
