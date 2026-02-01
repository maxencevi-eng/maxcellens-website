'use client';

import { useCallback } from 'react';
import { trackPageview, trackClick } from '../../lib/analyticsClient';

export function useAnalytics() {
  const trackEvent = useCallback((eventType: 'pageview' | 'click', data: { path?: string; element_id?: string; metadata?: Record<string, unknown>; duration?: number }) => {
    if (typeof window === 'undefined') return;
    const path = data.path ?? window.location.pathname ?? '/';
    if (eventType === 'pageview') {
      trackPageview(path, data.duration);
    } else {
      trackClick(path, data.element_id, data.metadata);
    }
  }, []);

  return { trackEvent, trackPageview, trackClick };
}
