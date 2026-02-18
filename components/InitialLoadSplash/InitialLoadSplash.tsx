'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * InitialLoadSplash – Full-screen overlay that covers the page while
 * critical above-the-fold elements load (navbar, logo, header image).
 *
 * Works on:
 *   - Initial page load (hard refresh)
 *   - Client-side SPA navigations (route changes)
 *
 * Strategy: only wait for the header bar (nav, logo, icons) to be painted,
 * then reveal. The rest of the page loads underneath while the user
 * starts reading the header area.
 */
export default function InitialLoadSplash() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const removed = useRef(false);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const isFirstRender = useRef(true);

  const reveal = useCallback(() => {
    if (removed.current) return;
    removed.current = true;
    setFadeOut(true);
    setTimeout(() => setVisible(false), 350);
  }, []);

  // SPA navigation: re-show splash on route change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      removed.current = false;
      setFadeOut(false);
      setVisible(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!visible || removed.current) return;

    removed.current = false;
    let cancelled = false;

    async function waitForCritical() {
      // 1. Wait for fonts (fast if cached)
      try {
        await document.fonts.ready;
      } catch { /* ignore */ }

      if (cancelled) return;

      // 2. Wait only for critical header-area images (logo, nav icons)
      //    These are small and should load very fast.
      try {
        const headerEl = document.querySelector('header');
        if (headerEl) {
          const headerImages = Array.from(headerEl.querySelectorAll('img')) as HTMLImageElement[];
          if (headerImages.length > 0) {
            await Promise.race([
              Promise.all(
                headerImages.map((img) =>
                  img.complete ? Promise.resolve() : img.decode().catch(() => {})
                )
              ),
              // Don't wait more than 600ms for header images
              new Promise<void>((r) => setTimeout(r, 600)),
            ]);
          }
        }
      } catch { /* ignore */ }

      if (cancelled) return;

      // 3. Minimal paint frame
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      if (!cancelled) reveal();
    }

    // Hard safety: reveal after 1.2s max
    const safetyTimer = setTimeout(() => {
      if (!cancelled) reveal();
    }, 1200);

    waitForCritical();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [visible, reveal]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--bg-color, #000)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    />
  );
}
