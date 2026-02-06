import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { parseIpFilter, hashedIpList } from '../../../../lib/analytics';
import { isLikelyBot } from '../../../../lib/bot-detection';

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
    const excludeHashes = [
      ...(filter.exclude?.length ? hashedIpList(filter.exclude) : []),
      ...(filter.excludeHashes?.length ? filter.excludeHashes : []),
    ].filter(Boolean);
    const excludeHashesOrNull = excludeHashes.length ? excludeHashes : null;

    const { data: excludeBotsRow } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'analytics_exclude_bots').maybeSingle();
    const excludeBots = (() => {
      const v = (excludeBotsRow as { value?: string } | null)?.value;
      if (v === 'false' || v === '0') return false;
      if (v === 'true' || v === '1') return true;
      return true;
    })();

    let useBotColumns = true;
    const sessionSelectWithBot = 'id, session_id, ip_hash, country, city, referrer, browser, created_at, user_agent, is_bot, human_validated';
    const sessionSelectFallback = 'id, session_id, ip_hash, country, city, referrer, browser, created_at, user_agent';
    let sessionsRes = await supabaseAdmin
      .from('analytics_sessions')
      .select(sessionSelectWithBot)
      .gte('created_at', sinceStr)
      .lte('created_at', untilStr)
      .or('is_authenticated.is.null,is_authenticated.eq.false');

    if (sessionsRes.error && /does not exist|column.*is_authenticated/i.test(sessionsRes.error.message)) {
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select(sessionSelectWithBot)
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr);
    }
    if (sessionsRes.error && /column.*(is_bot|human_validated)/i.test(sessionsRes.error.message)) {
      useBotColumns = false;
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select(sessionSelectFallback)
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr)
        .or('is_authenticated.is.null,is_authenticated.eq.false');
    }
    if (sessionsRes.error && /column.*referrer/i.test(sessionsRes.error.message)) {
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select(useBotColumns ? 'id, session_id, ip_hash, country, city, browser, created_at, user_agent, is_bot, human_validated' : 'id, session_id, ip_hash, country, city, browser, created_at, user_agent')
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr)
        .or('is_authenticated.is.null,is_authenticated.eq.false');
    }
    if (sessionsRes.error && /column.*browser/i.test(sessionsRes.error.message)) {
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, ip_hash, country, city, referrer, created_at, user_agent')
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr)
        .or('is_authenticated.is.null,is_authenticated.eq.false');
    }
    if (sessionsRes.error && /column.*user_agent/i.test(sessionsRes.error.message)) {
      sessionsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select('id, session_id, ip_hash, country, city, referrer, browser, created_at')
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr)
        .or('is_authenticated.is.null,is_authenticated.eq.false');
    }
    if (sessionsRes.error) return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
    type SessionRow = { id: string; session_id: string; ip_hash: string | null; country: string | null; city: string | null; referrer?: string | null; browser?: string | null; created_at: string; ip?: string | null; user_agent?: string | null; is_bot?: boolean | null; human_validated?: boolean | null };
    let sessions = (sessionsRes.data || []) as SessionRow[];

    if (includeHashes?.length) sessions = sessions.filter((s) => s.ip_hash && includeHashes.includes(s.ip_hash));
    if (excludeHashesOrNull?.length) sessions = sessions.filter((s) => !s.ip_hash || !excludeHashesOrNull.includes(s.ip_hash));
    if (excludeBots) {
      if (useBotColumns) {
        sessions = sessions.filter((s) => (s as SessionRow).human_validated === true || (s as SessionRow).is_bot !== true);
      } else {
        sessions = sessions.filter((s) => !isLikelyBot(s.user_agent));
      }
    }

    let visitors: { ip: string | null; ip_hash: string | null; country: string; city: string; sessionCount: number }[] = [];
    try {
      const visitorSelectWithBot = 'session_id, ip_hash, ip, country, city, user_agent, is_bot, human_validated';
    const visitorSelectFallback = 'session_id, ip_hash, ip, country, city, user_agent';
    let visitorsUseBotColumns = true;
    let visitorsRes = await supabaseAdmin
        .from('analytics_sessions')
        .select(visitorSelectWithBot)
        .gte('created_at', sinceStr)
        .lte('created_at', untilStr)
        .or('is_authenticated.is.null,is_authenticated.eq.false');
    if (visitorsRes.error && /column.*(is_bot|human_validated)/i.test(visitorsRes.error.message)) {
      visitorsUseBotColumns = false;
      visitorsRes = await supabaseAdmin
          .from('analytics_sessions')
          .select(visitorSelectFallback)
          .gte('created_at', sinceStr)
          .lte('created_at', untilStr)
          .or('is_authenticated.is.null,is_authenticated.eq.false');
    }
      if (visitorsRes.error && /column.*ip/i.test(visitorsRes.error.message)) {
        visitorsRes = await supabaseAdmin
          .from('analytics_sessions')
          .select(visitorsUseBotColumns ? 'session_id, ip_hash, country, city, user_agent, is_bot, human_validated' : 'session_id, ip_hash, country, city, user_agent')
          .gte('created_at', sinceStr)
          .lte('created_at', untilStr)
          .or('is_authenticated.is.null,is_authenticated.eq.false');
      }
      if (visitorsRes.error && /column.*user_agent/i.test(visitorsRes.error.message)) {
        visitorsRes = await supabaseAdmin
          .from('analytics_sessions')
          .select(visitorsUseBotColumns ? 'session_id, ip_hash, ip, country, city, is_bot, human_validated' : 'session_id, ip_hash, ip, country, city')
          .gte('created_at', sinceStr)
          .lte('created_at', untilStr)
          .or('is_authenticated.is.null,is_authenticated.eq.false');
      }
      
      // Traiter les visiteurs après le calcul des durées
      if (!visitorsRes.error && visitorsRes.data?.length) {
        type VisitorRow = { session_id: string; ip_hash: string | null; ip?: string | null; country: string | null; city: string | null; user_agent?: string | null; is_bot?: boolean | null; human_validated?: boolean | null };
        let allSessions = (visitorsRes.data || []) as VisitorRow[];
        if (excludeBots) {
          if (visitorsUseBotColumns) {
            allSessions = allSessions.filter((s) => {
              const sessionDuration = sessionDurations.get(s.session_id) || 0;
              const isBotByDuration = sessionDuration < 1000; // moins d'1 seconde
              return s.human_validated === true || 
                     s.is_bot !== true || 
                     !isBotByDuration;
            });
          } else {
            allSessions = allSessions.filter((s) => {
              const sessionDuration = sessionDurations.get(s.session_id) || 0;
              const isBotByDuration = sessionDuration < 1000; // moins d'1 seconde
              return !isLikelyBot(s.user_agent) && !isBotByDuration;
            });
          }
        }
        const byHash = new Map<string, { ip: string | null; ip_hash: string | null; country: string; city: string; count: number }>();
        allSessions.forEach((s) => {
          const key = s.ip_hash ?? '';
          const countryLabel = (s.country && String(s.country).trim()) ? String(s.country).trim() : 'Inconnu';
          const cityLabel = (s.city && String(s.city).trim()) ? String(s.city).trim() : 'Inconnu';
          const cur = byHash.get(key);
          if (!cur) byHash.set(key, { ip: s.ip ?? null, ip_hash: s.ip_hash ?? null, country: countryLabel, city: cityLabel, count: 1 });
          else cur.count += 1;
        });
        visitors = Array.from(byHash.entries())
          .map(([, v]) => ({ ip: v.ip, ip_hash: v.ip_hash, country: v.country, city: v.city, sessionCount: v.count }))
          .sort((a, b) => b.sessionCount - a.sessionCount);
        // Exclure les visiteurs dont le hash est dans le filtre d'exclusion (ils ne doivent plus apparaître dans la liste)
        if (excludeHashesOrNull?.length) {
          visitors = visitors.filter((v) => !v.ip_hash || !excludeHashesOrNull.includes(v.ip_hash));
        }
        // Si filtre "inclure uniquement" : ne garder que les visiteurs dont l'IP/hash est dans la liste
        if (includeHashes?.length) {
          visitors = visitors.filter((v) => v.ip_hash && includeHashes.includes(v.ip_hash));
        }
      }
    } catch (_) {}

    const sessionIds = sessions.map((s) => s.session_id);

    const eventsRes = await supabaseAdmin
      .from('analytics_events')
      .select('id, session_id, event_type, path, element_id, duration, created_at')
      .in('session_id', sessionIds.length ? sessionIds : ['__none__'])
      .gte('created_at', sinceStr)
      .lte('created_at', untilStr);
    if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
    const events = (eventsRes.data || []) as { session_id: string; event_type: string; path: string | null; element_id: string | null; duration: number | null; created_at: string }[];

    // Calculer la durée totale par session pour filtrer les bots
    const sessionDurations = new Map<string, number>();
    const pageviews = events.filter((e) => e.event_type === 'pageview');
    pageviews.forEach((pv) => {
      const current = sessionDurations.get(pv.session_id) || 0;
      sessionDurations.set(pv.session_id, current + (pv.duration ?? 0));
    });

    // Filtrer les sessions de moins d'1 seconde si excludeBots est actif
    if (excludeBots) {
      if (useBotColumns) {
        sessions = sessions.filter((s) => {
          const sessionDuration = sessionDurations.get(s.session_id) || 0;
          const isBotByDuration = sessionDuration < 1000; // moins d'1 seconde
          return (s as SessionRow).human_validated === true || 
                 (s as SessionRow).is_bot !== true || 
                 !isBotByDuration;
        });
      } else {
        sessions = sessions.filter((s) => {
          const sessionDuration = sessionDurations.get(s.session_id) || 0;
          const isBotByDuration = sessionDuration < 1000; // moins d'1 seconde
          return !isLikelyBot(s.user_agent) && !isBotByDuration;
        });
      }
    }

    const clicks = events.filter((e) => e.event_type === 'click');
    const totalViews = pageviews.length;
    const uniqueVisitors = new Set(sessions.map((s) => s.session_id)).size;
    const totalDuration = pageviews.reduce((acc, e) => acc + (e.duration ?? 0), 0);
    const pageviewsWithDuration = pageviews.filter((e) => e.duration != null && e.duration > 0);
    const avgTimePerPage = pageviewsWithDuration.length
      ? Math.round(totalDuration / pageviewsWithDuration.length)
      : 0;
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

    const sessionById = new Map(sessions.map((s) => [s.session_id, s]));

    const countryCount = new Map<string, number>();
    const cityCount = new Map<string, number>();
    const countryDuration = new Map<string, { sum: number; count: number }>();
    const cityDuration = new Map<string, { sum: number; count: number }>();
    const countryLabel = (v: string | null | undefined) => (v && String(v).trim()) ? String(v).trim() : 'Inconnu';
    const cityLabel = (v: string | null | undefined) => (v && String(v).trim()) ? String(v).trim() : 'Inconnu';
    sessions.forEach((s) => {
      const c = countryLabel(s.country);
      countryCount.set(c, (countryCount.get(c) || 0) + 1);
      const cityVal = cityLabel(s.city);
      const cityKey = `${c}|${cityVal}`;
      cityCount.set(cityKey, (cityCount.get(cityKey) || 0) + 1);
    });
    pageviews.forEach((e) => {
      const dur = e.duration ?? 0;
      if (dur <= 0) return;
      const session = sessionById.get(e.session_id);
      if (!session) return;
      const c = countryLabel(session.country);
      const cityKey = `${c}|${cityLabel(session.city)}`;
      const cd = countryDuration.get(c) || { sum: 0, count: 0 };
      cd.sum += dur;
      cd.count += 1;
      countryDuration.set(c, cd);
      const cid = cityDuration.get(cityKey) || { sum: 0, count: 0 };
      cid.sum += dur;
      cid.count += 1;
      cityDuration.set(cityKey, cid);
    });
    const byCountry = Array.from(countryCount.entries())
      .map(([country, count]) => ({
        country,
        count,
        avgTimeSeconds: (() => { const d = countryDuration.get(country); return d?.count ? Math.round(d.sum / d.count) : 0; })(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    const byCity = Array.from(cityCount.entries())
      .map(([key, count]) => {
        const [country, city] = key.split('|');
        const d = cityDuration.get(key);
        const avgTimeSeconds = d?.count ? Math.round(d.sum / d.count) : 0;
        return { country, city: city || 'Inconnu', count, avgTimeSeconds };
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

    const sourceBrowserCount = new Map<string, number>();
    const sourceBrowserDuration = new Map<string, { sum: number; count: number }>();
    const browserLabelNorm = (v: string | null | undefined) => (v && String(v).trim()) ? String(v).trim() : 'Inconnu';
    sessions.forEach((s) => {
      const sourceLabel = referrerToSourceLabel(s.referrer);
      const browserLabel = browserLabelNorm((s as { browser?: string | null }).browser);
      const key = `${sourceLabel}\t${browserLabel}`;
      sourceBrowserCount.set(key, (sourceBrowserCount.get(key) || 0) + 1);
    });
    pageviews.forEach((e) => {
      const dur = e.duration ?? 0;
      if (dur <= 0) return;
      const session = sessionById.get(e.session_id);
      if (!session) return;
      const sourceLabel = referrerToSourceLabel(session.referrer);
      const browserLabel = browserLabelNorm((session as { browser?: string | null }).browser);
      const key = `${sourceLabel}\t${browserLabel}`;
      const d = sourceBrowserDuration.get(key) || { sum: 0, count: 0 };
      d.sum += dur;
      d.count += 1;
      sourceBrowserDuration.set(key, d);
    });
    const bySource = Array.from(sourceBrowserCount.entries())
      .map(([key, count]) => {
        const [source, browser] = key.split('\t');
        const d = sourceBrowserDuration.get(key);
        const avgTimeSeconds = d?.count ? Math.round(d.sum / d.count) : 0;
        return { source: source || 'Accès direct', browser: browser || 'Inconnu', count, avgTimeSeconds };
      })
      .sort((a, b) => b.count - a.count);

    const uniqueVisitorsByPath = new Map<string, Set<string>>();
    const pathDuration = new Map<string, { sum: number; count: number }>();
    pageviews.forEach((e) => {
      const p = e.path || '/';
      let set = uniqueVisitorsByPath.get(p);
      if (!set) { set = new Set(); uniqueVisitorsByPath.set(p, set); }
      set.add(e.session_id);
      const dur = e.duration ?? 0;
      if (dur > 0) {
        const d = pathDuration.get(p) || { sum: 0, count: 0 };
        d.sum += dur;
        d.count += 1;
        pathDuration.set(p, d);
      }
    });
    const visitsByPage = Array.from(uniqueVisitorsByPath.entries())
      .map(([path, set]) => {
        const d = pathDuration.get(path);
        const avgTimeSeconds = d?.count ? Math.round(d.sum / d.count) : 0;
        return { path, uniqueVisitors: set.size, avgTimeSeconds };
      })
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
      visitors,
      filterApplied: { include: !!includeHashes?.length, exclude: !!excludeHashes?.length },
      excludeBots,
    });
  } catch (err: any) {
    console.error('admin analytics error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
