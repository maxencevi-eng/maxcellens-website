import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { parseIpFilter, hashedIpList } from '../../../../lib/analytics';

export const dynamic = 'force-dynamic';

const DEFAULT_DAYS = 30;

type PeriodMode = 'days' | 'current_month' | 'last_month';

function getDateRange(period: PeriodMode, daysNum: number): { since: Date; until: Date } {
  const now = new Date();
  const until = new Date(now);
  until.setHours(23, 59, 59, 999);

  if (period === 'current_month') {
    const since = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { since, until };
  }
  if (period === 'last_month') {
    // Mois précédent : 1er jour du mois dernier → dernier jour du mois dernier
    const since = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { since, until: endLastMonth };
  }
  const since = new Date(now);
  since.setDate(since.getDate() - daysNum);
  since.setHours(0, 0, 0, 0);
  return { since, until };
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

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const periodParam = url.searchParams.get('period') as PeriodMode | null;
    const period: PeriodMode = periodParam === 'current_month' || periodParam === 'last_month' ? periodParam : 'days';
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || String(DEFAULT_DAYS), 10) || DEFAULT_DAYS));
    const { since, until } = getDateRange(period, days);
    const sinceStr = since.toISOString();
    const untilStr = until.toISOString();

    const { data: filterRow } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'analytics_ip_filter').maybeSingle();
    const filter = parseIpFilter((filterRow as any)?.value);
    const includeHashes = filter.include?.length ? hashedIpList(filter.include) : null;
    const excludeHashes = filter.exclude?.length ? hashedIpList(filter.exclude) : null;

    let sessionsRes = await supabaseAdmin
      .from('analytics_sessions')
      .select('id, session_id, ip_hash, country, city, referrer, created_at')
      .gte('created_at', sinceStr)
      .lte('created_at', untilStr)
      .or('is_authenticated.is.null,is_authenticated.eq.false');

    if (sessionsRes.error && /does not exist|column.*is_authenticated/i.test(sessionsRes.error.message)) {
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, ip_hash, country, city, referrer, created_at')
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr);
    }
    if (sessionsRes.error && /column.*referrer/i.test(sessionsRes.error.message)) {
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, ip_hash, country, city, created_at')
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr)
        .or('is_authenticated.is.null,is_authenticated.eq.false');
    }
    if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
    let sessions = (sessionsRes.data || []) as { id: string; session_id: string; ip_hash: string | null; country: string | null; city: string | null; referrer?: string | null; created_at: string }[];

    if (includeHashes?.length) sessions = sessions.filter((s) => s.ip_hash && includeHashes.includes(s.ip_hash));
    if (excludeHashes?.length) sessions = sessions.filter((s) => !s.ip_hash || !excludeHashes.includes(s.ip_hash));

    const sessionIds = sessions.map((s) => s.session_id);

    const eventsRes = await supabaseAdmin
      .from('analytics_events')
      .select('id, session_id, event_type, path, element_id, duration, created_at')
      .in('session_id', sessionIds.length ? sessionIds : ['__none__'])
      .gte('created_at', sinceStr)
      .lte('created_at', untilStr);
    if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
    const events = (eventsRes.data || []) as { session_id: string; event_type: string; path: string | null; element_id: string | null; duration: number | null; created_at: string }[];

    const pageviews = events.filter((e) => e.event_type === 'pageview');
    const clicks = events.filter((e) => e.event_type === 'click');
    const totalViews = pageviews.length;
    const uniqueVisitors = new Set(sessions.map((s) => s.session_id)).size;
    const totalDuration = pageviews.reduce((acc, e) => acc + (e.duration ?? 0), 0);
    const avgTimePerPage = totalViews ? Math.round(totalDuration / totalViews) : 0;
    const singlePageSessions = new Set<string>();
    const pvBySession = new Map<string, number>();
    pageviews.forEach((e) => pvBySession.set(e.session_id, (pvBySession.get(e.session_id) || 0) + 1));
    pvBySession.forEach((count, sid) => { if (count === 1) singlePageSessions.add(sid); });
    const bounceRate = uniqueVisitors ? Math.round((singlePageSessions.size / uniqueVisitors) * 100) : 0;
    const avgPagesPerVisit = uniqueVisitors ? Math.round((totalViews / uniqueVisitors) * 10) / 10 : 0;

    const byDay = new Map<string, { views: number; visitors: Set<string> }>();
    const walk = new Date(since);
    walk.setHours(0, 0, 0, 0);
    const untilDay = new Date(until);
    untilDay.setHours(0, 0, 0, 0);
    while (walk <= untilDay) {
      const key = walk.toISOString().slice(0, 10);
      byDay.set(key, { views: 0, visitors: new Set() });
      walk.setDate(walk.getDate() + 1);
    }
    pageviews.forEach((e) => {
      const key = e.created_at.slice(0, 10);
      const cur = byDay.get(key);
      if (cur) {
        cur.views += 1;
        const s = events.find((x) => x.session_id === e.session_id);
        if (s) cur.visitors.add(e.session_id);
      }
    });
    const trafficLast30Days = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, { views, visitors }]) => ({ date, views, visitors: visitors.size }));

    const pathCount = new Map<string, { views: number; duration: number }>();
    pageviews.forEach((e) => {
      const p = e.path || '/';
      const cur = pathCount.get(p) || { views: 0, duration: 0 };
      cur.views += 1;
      cur.duration += e.duration ?? 0;
      pathCount.set(p, cur);
    });
    const topContent = Array.from(pathCount.entries())
      .map(([path, { views, duration }]) => ({ path, views, avgTime: views ? Math.round(duration / views) : 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const countryCount = new Map<string, number>();
    const cityCount = new Map<string, number>();
    sessions.forEach((s) => {
      const c = s.country || 'Inconnu';
      countryCount.set(c, (countryCount.get(c) || 0) + 1);
      const cityKey = [c, s.city || ''].join('|');
      cityCount.set(cityKey, (cityCount.get(cityKey) || 0) + 1);
    });
    const byCountry = Array.from(countryCount.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 15);
    const byCity = Array.from(cityCount.entries())
      .map(([key, count]) => {
        const [country, city] = key.split('|');
        return { country, city: city || '—', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const clickKeyCount = new Map<string, number>();
    clicks.forEach((e) => {
      const path = e.path || '/';
      const id = e.element_id || 'inconnu|';
      const key = `${path}\t${id}`;
      clickKeyCount.set(key, (clickKeyCount.get(key) || 0) + 1);
    });
    const topClicks = Array.from(clickKeyCount.entries())
      .map(([key, count]) => {
        const [path, element_id] = key.split('\t');
        return { path: path || '/', element_id: element_id || 'inconnu|', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    function referrerToSourceLabel(ref: string | null | undefined): string {
      const r = (ref || '').trim().toLowerCase();
      if (!r) return 'Accès direct';
      try {
        const url = new URL(r);
        const host = url.hostname || '';
        if (/google\./i.test(host)) return 'Google';
        if (/bing\./i.test(host)) return 'Bing';
        if (/yahoo\./i.test(host)) return 'Yahoo';
        if (/duckduckgo\./i.test(host)) return 'DuckDuckGo';
        if (/ecosia\./i.test(host)) return 'Ecosia';
        if (/facebook\./i.test(host)) return 'Facebook';
        if (/instagram\./i.test(host)) return 'Instagram';
        if (/linkedin\./i.test(host)) return 'LinkedIn';
        if (/twitter\./i.test(host) || /x\.com/i.test(host)) return 'Twitter / X';
        if (/youtube\./i.test(host)) return 'YouTube';
        if (/tiktok\./i.test(host)) return 'TikTok';
        if (host && host !== 'localhost' && !host.startsWith('127.')) return host.replace(/^www\./, '');
      } catch (_) {}
      return r ? 'Autre (lien externe)' : 'Accès direct';
    }

    const sourceCount = new Map<string, number>();
    sessions.forEach((s) => {
      const label = referrerToSourceLabel(s.referrer);
      sourceCount.set(label, (sourceCount.get(label) || 0) + 1);
    });
    const bySource = Array.from(sourceCount.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const uniqueVisitorsByPath = new Map<string, Set<string>>();
    pageviews.forEach((e) => {
      const p = e.path || '/';
      let set = uniqueVisitorsByPath.get(p);
      if (!set) { set = new Set(); uniqueVisitorsByPath.set(p, set); }
      set.add(e.session_id);
    });
    const visitsByPage = Array.from(uniqueVisitorsByPath.entries())
      .map(([path, set]) => ({ path, uniqueVisitors: set.size }))
      .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors);

    return NextResponse.json({
      kpis: {
        uniqueVisitors: uniqueVisitors,
        totalViews: totalViews,
        avgPagesPerVisit: avgPagesPerVisit,
        avgTimePerPageSeconds: avgTimePerPage,
        bounceRatePercent: bounceRate,
      },
      trafficLast30Days: trafficLast30Days,
      topContent,
      byCountry,
      byCity,
      topClicks,
      bySource,
      visitsByPage,
      filterApplied: { include: !!includeHashes?.length, exclude: !!excludeHashes?.length },
    });
  } catch (err: any) {
    console.error('admin analytics error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
