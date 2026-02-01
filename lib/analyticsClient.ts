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
    navigator.sendBeacon(url, blob);
    return;
  }
  fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
}

export function trackPageview(path: string, durationSeconds?: number, isAuthenticated?: boolean) {
  const { session_id, session } = getSessionPayload();
  const payload: Record<string, unknown> = {
    session_id,
    session,
    event_type: 'pageview',
    path: path || '/',
    duration: durationSeconds ?? undefined,
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
