'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * InitialLoadSplash – Full-screen overlay that covers the page while
 * critical above-the-fold elements fully render (fonts loaded, CSS variables
 * applied, nav bar styled, logo at correct size, icons visible).
 *
 * Waits for the `site-ready` class on <html> (set by the font-loader script
 * in layout.tsx after fonts are loaded + a settling delay).
 * Also waits for header images (logo) to decode.
 *
 * Works on initial load AND client-side SPA navigations.
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
      const html = document.documentElement;

      // 1. Wait for `site-ready` class (fonts loaded + CSS vars applied + settling delay)
      //    The font-loader script in layout.tsx adds this class after fonts.ready + 180ms delay.
      if (!html.classList.contains('site-ready')) {
        await new Promise<void>((resolve) => {
          // Poll for the class (MutationObserver on classList)
          const observer = new MutationObserver(() => {
            if (html.classList.contains('site-ready') || html.classList.contains('wf-loaded') || html.classList.contains('wf-failed')) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(html, { attributes: true, attributeFilter: ['class'] });
          // Also resolve if already set (race)
          if (html.classList.contains('site-ready') || html.classList.contains('wf-loaded') || html.classList.contains('wf-failed')) {
            observer.disconnect();
            resolve();
          }
        });
      }

      if (cancelled) return;

      // 2. Wait for header images (logo, icons) to be fully decoded
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
              new Promise<void>((r) => setTimeout(r, 800)),
            ]);
          }
        }
      } catch { /* ignore */ }

      if (cancelled) return;

      // 3. Wait one extra animation frame so the browser paints the styled header
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      if (!cancelled) reveal();
    }

    // Hard safety: reveal after 2s max
    const safetyTimer = setTimeout(() => {
      if (!cancelled) reveal();
    }, 2000);

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
