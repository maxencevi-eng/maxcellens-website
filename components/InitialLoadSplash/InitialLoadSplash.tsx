'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * InitialLoadSplash – Full-screen overlay with animated favicon logo.
 * Shows during initial load AND client-side SPA navigations.
 *
 * Waits for `site-ready` class on <html> (fonts loaded + CSS vars),
 * nav data, and header images before revealing the page.
 */

const KEYFRAMES = `
@keyframes _spl_logoIn {
  0%   { transform: scale(0.55) translateY(12px); opacity: 0; }
  65%  { transform: scale(1.08) translateY(-2px); opacity: 1; }
  100% { transform: scale(1)    translateY(0);    opacity: 1; }
}
@keyframes _spl_ring {
  0%   { transform: scale(0.88); opacity: 0.55; }
  100% { transform: scale(2.6);  opacity: 0; }
}
@keyframes _spl_ring2 {
  0%   { transform: scale(0.88); opacity: 0.3; }
  100% { transform: scale(2.6);  opacity: 0; }
}
@keyframes _spl_bar {
  0%   { transform: scaleX(0); }
  60%  { transform: scaleX(0.75); }
  100% { transform: scaleX(1); }
}
@keyframes _spl_fadeSlideUp {
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

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
    setTimeout(() => setVisible(false), 600);
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

      // 1. Wait for `site-ready` class (fonts + CSS vars + settling delay)
      if (!html.classList.contains('site-ready')) {
        await new Promise<void>((resolve) => {
          const observer = new MutationObserver(() => {
            if (
              html.classList.contains('site-ready') ||
              html.classList.contains('wf-loaded') ||
              html.classList.contains('wf-failed')
            ) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(html, { attributes: true, attributeFilter: ['class'] });
          if (
            html.classList.contains('site-ready') ||
            html.classList.contains('wf-loaded') ||
            html.classList.contains('wf-failed')
          ) {
            observer.disconnect();
            resolve();
          }
        });
      }

      if (cancelled) return;

      // 2. Wait for nav menu visibility data
      const nav = document.querySelector('[data-site-nav="menu"]');
      if (nav && !nav.hasAttribute('data-nav-ready')) {
        await Promise.race([
          new Promise<void>((resolve) => {
            const obs = new MutationObserver(() => {
              if (nav.hasAttribute('data-nav-ready')) { obs.disconnect(); resolve(); }
            });
            obs.observe(nav, { attributes: true, attributeFilter: ['data-nav-ready'] });
            if (nav.hasAttribute('data-nav-ready')) { obs.disconnect(); resolve(); }
          }),
          new Promise<void>((r) => setTimeout(r, 600)),
        ]);
      }

      if (cancelled) return;

      // 3. Wait for header images (logo, icons) to decode
      try {
        const headerEl = document.querySelector('header');
        if (headerEl) {
          const headerImages = Array.from(headerEl.querySelectorAll('img')) as HTMLImageElement[];
          if (headerImages.length > 0) {
            await Promise.race([
              Promise.all(headerImages.map((img) =>
                img.complete ? Promise.resolve() : img.decode().catch(() => {})
              )),
              new Promise<void>((r) => setTimeout(r, 800)),
            ]);
          }
        }
      } catch { /* ignore */ }

      if (cancelled) return;

      // 4. Extra frames so the browser paints the fully-styled page
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      // 5. Extra 200ms buffer so animations land cleanly
      await new Promise<void>((r) => setTimeout(r, 200));

      if (!cancelled) reveal();
    }

    // Hard safety: reveal after 2.5s max
    const safetyTimer = setTimeout(() => { if (!cancelled) reveal(); }, 2500);

    waitForCritical();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [visible, reveal]);

  if (!visible) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: '#213431',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: fadeOut ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {/* ── Logo + sonar rings ── */}
        <div style={{ position: 'relative', width: 80, height: 80 }}>

          {/* Ring 1 — starts at 0.5s */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 15,
            border: '1.5px solid rgba(255,255,255,0.28)',
            animation: '_spl_ring 2.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
            animationDelay: '0.5s',
          }} />

          {/* Ring 2 — offset by 1.1s for staggered sonar feel */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 15,
            border: '1px solid rgba(255,255,255,0.16)',
            animation: '_spl_ring2 2.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
            animationDelay: '1.6s',
          }} />

          {/* Favicon logo */}
          <div style={{
            width: 80,
            height: 80,
            animation: '_spl_logoIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            animationDelay: '0.05s',
          }}>
            {/* Inline reproduction of /public/favicon.svg at 80px */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              fill="none"
              width="80"
              height="80"
              style={{ display: 'block', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.35))' }}
            >
              <rect width="32" height="32" rx="6" fill="#2b4540" />
              <text
                x="16"
                y="22"
                fontFamily="system-ui, sans-serif"
                fontSize="18"
                fontWeight="700"
                fill="white"
                textAnchor="middle"
              >
                M
              </text>
            </svg>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{
          width: 72,
          height: 2,
          background: 'rgba(255,255,255,0.10)',
          borderRadius: 2,
          overflow: 'hidden',
          animation: '_spl_fadeSlideUp 0.4s ease-out both',
          animationDelay: '0.3s',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.75) 100%)',
            borderRadius: 2,
            transformOrigin: 'left center',
            transform: 'scaleX(0)',
            animation: '_spl_bar 2.0s cubic-bezier(0.4, 0, 0.2, 1) both',
            animationDelay: '0.35s',
          }} />
        </div>
      </div>
    </>
  );
}
