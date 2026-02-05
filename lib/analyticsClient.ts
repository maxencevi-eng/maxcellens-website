/**
 * Client-side analytics: session_id, device/os/browser detection, send to /api/analytics/collect.
 * Non-blocking: uses sendBeacon for leave events.
 */

const SESSION_KEY = 'analytics_session_id';
const PAGE_ENTER_KEY = 'analytics_page_enter';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return '';
  }
}

function getDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getOs(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/win/i.test(ua)) return 'Windows';
  if (/mac/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  return 'unknown';
}

function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  let name = 'unknown';
  if (/edg/i.test(ua)) name = 'Edge';
  else if (/chrome/i.test(ua)) name = 'Chrome';
  else if (/firefox/i.test(ua)) name = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) name = 'Safari';
  return name;
}

export function getSessionPayload() {
  return {
    session_id: getOrCreateSessionId(),
    session: { device: getDevice(), os: getOs(), browser: getBrowser() },
  };
}

export function sendToCollect(payload: Record<string, unknown>, useBeacon = false) {
  const url = '/api/analytics/collect';
  const body = JSON.stringify(payload);
  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    const sent = navigator.sendBeacon(url, blob);
    if (typeof window !== 'undefined' && !sent && (process.env.NODE_ENV === 'development' || window.location.search.includes('analytics_debug=1'))) {
      console.warn('[Analytics] sendBeacon failed, fallback fetch');
      fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).then((r) => { if (!r.ok) console.warn('[Analytics] collect failed', r.status); }).catch((e) => console.warn('[Analytics] collect error', e));
    }
    return;
  }
  fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
    .then(async (r) => {
      if (!r.ok && typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || window.location.search.includes('analytics_debug=1'))) {
        let msg = r.status + ' ' + r.statusText;
        try { const j = await r.json(); if (j?.error) msg += ' — ' + j.error; } catch (_) {}
        console.warn('[Analytics] collect failed:', msg);
      }
    })
    .catch((e) => {
      if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || window.location.search.includes('analytics_debug=1'))) {
        console.warn('[Analytics] collect error', e);
      }
    });
}

function getReferrer(): string {
  if (typeof document === 'undefined') return '';
  try {
    return (document.referrer || '').trim();
  } catch {
    return '';
  }
}

export function trackPageview(path: string, durationSeconds?: number, isAuthenticated?: boolean) {
  const { session_id, session } = getSessionPayload();
  const payload: Record<string, unknown> = {
    session_id,
    session,
    event_type: 'pageview',
    path: path || '/',
    duration: durationSeconds ?? undefined,
    referrer: getReferrer(),
  };
  if (typeof isAuthenticated === 'boolean') payload.is_authenticated = isAuthenticated;
  sendToCollect(payload, !!durationSeconds);
}

export function trackClick(path: string, elementId?: string, metadata?: Record<string, unknown>, isAuthenticated?: boolean) {
  const { session_id, session } = getSessionPayload();
  const payload: Record<string, unknown> = {
    session_id,
    session,
    event_type: 'click',
    path: path || '/',
    element_id: elementId,
    metadata: metadata ?? {},
  };
  if (typeof isAuthenticated === 'boolean') payload.is_authenticated = isAuthenticated;
  sendToCollect(payload);
}

/** Build full pageview payload (for sendBeacon with duration + is_authenticated). */
export function buildPageviewPayload(path: string, durationSeconds: number, isAuthenticated?: boolean): Record<string, unknown> {
  const { session_id, session } = getSessionPayload();
  const payload: Record<string, unknown> = {
    session_id,
    session,
    event_type: 'pageview',
    path: path || '/',
    duration: durationSeconds,
    referrer: getReferrer(),
  };
  if (typeof isAuthenticated === 'boolean') payload.is_authenticated = isAuthenticated;
  return payload;
}

export function getPageEnterTime(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const t = sessionStorage.getItem(PAGE_ENTER_KEY);
    return t ? parseInt(t, 10) : 0;
  } catch {
    return 0;
  }
}

export function setPageEnterTime() {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(PAGE_ENTER_KEY, String(Date.now()));
    } catch {}
  }
}

export function getTimeOnPageSeconds(): number {
  const enter = getPageEnterTime();
  if (!enter) return 0;
  return Math.max(0, Math.floor((Date.now() - enter) / 1000));
}
