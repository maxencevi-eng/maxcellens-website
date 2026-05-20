import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { parseIpFilter, hashedIpList } from '../../../../lib/analytics';
import { isLikelyBot, isLikelyDatacenterIp } from '../../../../lib/bot-detection';

export const dynamic = 'force-dynamic';

const DEFAULT_DAYS = 30;

type PeriodMode = 'days' | 'current_month' | 'last_month';

function getDateRange(period: PeriodMode, daysNum: number): { since: Date; until: Date } {
  const now = new Date();
  const until = new Date(now);
  until.setUTCHours(23, 59, 59, 999);

  if (period === 'current_month') {
    return { since: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), until };
  }
  if (period === 'last_month') {
    return {
      since: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
      until: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)),
    };
  }
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - daysNum);
  since.setUTCHours(0, 0, 0, 0);
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

    // Support single-day filter via ?date=YYYY-MM-DD
    const dateParam = url.searchParams.get('date');
    let since: Date, until: Date;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      since = new Date(dateParam + 'T00:00:00.000Z');
      until = new Date(dateParam + 'T23:59:59.999Z');
    } else {
      ({ since, until } = getDateRange(period, days));
    }
    const sinceStr = since.toISOString();
    const untilStr = until.toISOString();

    // Support visitor hash filter via ?visitorHashes=hash1,hash2,...
    const visitorHashesParam = url.searchParams.get('visitorHashes');
    const requestedVisitorHashes = visitorHashesParam ? visitorHashesParam.split(',').filter(Boolean) : null;

    const countriesParam = url.searchParams.get('countries');
    const requestedCountries = countriesParam ? countriesParam.split(',').map(s => decodeURIComponent(s)).filter(Boolean) : null;

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
    const sessionSelectWithBot = 'id, session_id, ip_hash, ip, country, city, referrer, browser, created_at, user_agent, is_bot, human_validated';
    const sessionSelectFallback = 'id, session_id, ip_hash, ip, country, city, referrer, browser, created_at, user_agent';
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

    // Calculer les durées des sessions AVANT les filtres
    const sessionIds = sessions.map((s) => s.session_id);
    const sessionDurations = new Map<string, number>(); // durée totale de la session
    if (sessionIds.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < sessionIds.length; i += BATCH) {
        const chunk = sessionIds.slice(i, i + BATCH);
        
        // Récupérer tous les événements avec timestamps
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
            
            // Utiliser uniquement les timestamps (premier -> dernier événement)
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
    
    // Appliquer les filtres dans l'ordre correct
    // 1. Filtre bots (si activé) - EXCLURE les bots et sessions courtes
    if (excludeBots) {
      sessions = sessions.filter((s) => {
        const dur = sessionDurations.get(s.session_id) || 0;
        if (dur < 1500) return false;
        if (useBotColumns && (s as SessionRow).is_bot === true) return false;
        // Re-vérifier UA + IP à chaque requête pour capter les bots enregistrés avant la mise à jour des patterns
        if (isLikelyBot(s.user_agent)) return false;
        if (isLikelyDatacenterIp((s as any).ip ?? null)) return false;
        return true;
      });
    }
    
    // 2. Filtre IP exclusion
    if (excludeHashesOrNull?.length) {
      sessions = sessions.filter((s) => !s.ip_hash || !excludeHashesOrNull.includes(s.ip_hash));
    }
    
    // 3. Filtre IP inclusion (si activé)
    if (includeHashes?.length) {
      sessions = sessions.filter((s) => s.ip_hash && includeHashes.includes(s.ip_hash));
    }

    // 4. Filtre par visiteurs sélectionnés (temporaire, via query param)
    if (requestedVisitorHashes?.length) {
      sessions = sessions.filter((s) => s.ip_hash && requestedVisitorHashes.includes(s.ip_hash));
    }

    // 5. Filtre par pays sélectionnés (temporaire, via query param)
    if (requestedCountries?.length) {
      sessions = sessions.filter((s) => {
        const c = (s.country && String(s.country).trim()) ? String(s.country).trim() : 'Inconnu';
        return requestedCountries.includes(c);
      });
    }

    const eventsRes = await supabaseAdmin
      .from('analytics_events')
      .select('id, session_id, event_type, path, element_id, duration, created_at')
      .in('session_id', sessions.length ? sessions.map((s) => s.session_id) : ['__none__'])
      .gte('created_at', sinceStr)
      .lte('created_at', untilStr);
    if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
    const events = (eventsRes.data || []) as { session_id: string; event_type: string; path: string | null; element_id: string | null; duration: number | null; created_at: string }[];

    // IMPORTANT: Refiltrer les events pour ne garder que ceux des sessions valides (post-filtre)
    // Cela garantit que tous les onglets (Contenu, Géo, Sources, Clics) respectent tous les filtres
    const validSessionIds = new Set(sessions.map((s) => s.session_id));
    const filteredEvents = events.filter((e) => validSessionIds.has(e.session_id));
    const filteredPageviews = filteredEvents.filter((e) => e.event_type === 'pageview');
    const filteredClicks = filteredEvents.filter((e) => e.event_type === 'click');

    let clicks = filteredClicks;
    let pageviews = filteredPageviews;
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
    walk.setUTCHours(0, 0, 0, 0);
    const untilDay = new Date(until);
    untilDay.setUTCHours(0, 0, 0, 0);
    while (walk <= untilDay) {
      const key = walk.toISOString().slice(0, 10);
      byDay.set(key, { views: 0, visitors: new Set() });
      walk.setUTCDate(walk.getUTCDate() + 1);
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
      .map(([path, { views, duration }]) => ({ path, views, avgTime: views ? Math.round(duration / views) : 0, totalTime: Math.round(duration) }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const sessionById = new Map(sessions.map((s) => [s.session_id, s]));

    // Build enriched visitors from already-filtered sessions + events (no extra DB query)
    type EnrichedVisitor = { ip: string | null; ip_hash: string | null; country: string; city: string; sessionCount: number; userAgent: string | null; durationMs: number; clicks: number; pages: string[] };
    const enrichedMap = new Map<string, EnrichedVisitor>();
    const countryLbl = (v: string | null | undefined) => (v && String(v).trim()) ? String(v).trim() : 'Inconnu';
    for (const s of sessions) {
      const key = s.ip_hash ?? `_${s.session_id}`;
      const dur = sessionDurations.get(s.session_id) ?? 0;
      const existing = enrichedMap.get(key);
      if (!existing) {
        enrichedMap.set(key, { ip: (s as any).ip ?? null, ip_hash: s.ip_hash ?? null, country: countryLbl(s.country), city: countryLbl(s.city), sessionCount: 1, userAgent: s.user_agent ?? null, durationMs: dur, clicks: 0, pages: [] });
      } else {
        existing.sessionCount++;
        existing.durationMs = Math.max(existing.durationMs, dur);
        if (!existing.userAgent && s.user_agent) existing.userAgent = s.user_agent;
      }
    }
    for (const e of filteredEvents) {
      const s = sessionById.get(e.session_id);
      if (!s) continue;
      const key = s.ip_hash ?? `_${s.session_id}`;
      const v = enrichedMap.get(key);
      if (!v) continue;
      if (e.event_type === 'click') v.clicks++;
      if (e.event_type === 'pageview' && e.path && !v.pages.includes(e.path)) v.pages.push(e.path);
    }
    const visitors = Array.from(enrichedMap.values()).sort((a, b) => b.sessionCount - a.sessionCount);

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
        avgTimeSiteSeconds: (() => { const d = countryDuration.get(country); return d?.sum && count ? Math.round(d.sum / count) : 0; })(),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    const byCity = Array.from(cityCount.entries())
      .map(([key, count]) => {
        const [country, city] = key.split('|');
        const d = cityDuration.get(key);
        const avgTimeSeconds = d?.count ? Math.round(d.sum / d.count) : 0;
        const avgTimeSiteSeconds = d?.sum && count ? Math.round(d.sum / count) : 0;
        return { country, city: city || 'Inconnu', count, avgTimeSeconds, avgTimeSiteSeconds };
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
