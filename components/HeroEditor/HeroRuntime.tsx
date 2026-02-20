"use client";
import React, { useEffect, useRef } from 'react';

type HeroSettings = { mode?: string; settings?: any };

export default function HeroRuntime() {
  const intervalRef = useRef<number | null>(null);
  const idxRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function refreshFromServer(page: string) {
      try {
        const resp = await fetch(`/api/admin/hero?slug=${encodeURIComponent(page)}`);
        if (!resp.ok) return null;
        const j = await resp.json();
        return j?.data || null;
      } catch (_) { return null; }
    }

    function applyBackground(url: string | null, hero: HTMLElement | null) {
      if (!hero) return;
      // Update the Next.js <Image> element directly (it renders as an <img> with fill)
      const img = hero.querySelector('img') as HTMLImageElement | null;
      if (img) {
        if (url) {
          // Add cache-busting param to force browser to fetch the new image
          const bustUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
          img.src = bustUrl;
          img.srcset = '';  // Clear srcset so browser uses src
          img.style.display = '';
        } else {
          img.style.display = 'none';
        }
      }
      // Also set background-image as fallback
      hero.style.backgroundImage = url ? `url(${url})` : '';
    }

    function startSlideshow(hero: HTMLElement, slides: string[] | null, speed: number | string = 3000) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      idxRef.current = 0;

      let effectiveSlides = Array.isArray(slides) && slides.length ? slides : null as string[] | null;
      if ((!effectiveSlides || !effectiveSlides.length)) {
        const ss = hero.querySelector('[data-slides]') as HTMLElement | null;
        if (ss) {
          try {
            const raw = ss.getAttribute('data-slides');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length) effectiveSlides = parsed;
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }

      if (!effectiveSlides || !effectiveSlides.length) return;

      // Show first slide on the <img> element
      const img = hero.querySelector('img') as HTMLImageElement | null;
      try {
        const firstUrl = effectiveSlides[0];
        if (img) { img.src = firstUrl; img.srcset = ''; img.style.display = ''; }
        hero.style.backgroundImage = `url(${firstUrl})`;
      } catch (_) {}
      intervalRef.current = window.setInterval(() => {
        try {
          idxRef.current = (idxRef.current + 1) % effectiveSlides!.length;
          const nextUrl = effectiveSlides![idxRef.current];
          try {
            const imgEl = hero.querySelector('img') as HTMLImageElement | null;
            if (imgEl) { imgEl.src = nextUrl; imgEl.srcset = ''; }
            hero.style.backgroundImage = `url(${nextUrl})`;
          } catch (_) {}
        } catch (_) { }
      }, Math.max(600, Number(speed) || 3000));
    }

    async function setupFromPage(page: string) {
      const hero = document.querySelector('[data-measure="hero"]') as HTMLElement | null;
      if (!hero) return;
      const row = await refreshFromServer(page);
      const ss = hero.querySelector('[data-slides]') as HTMLElement | null;
      const domSlides = ss ? (() => { try { const r = ss.getAttribute('data-slides'); return r ? JSON.parse(r) : null; } catch (_) { return null; } })() : null;

      if (!row && domSlides && domSlides.length) {
        startSlideshow(hero, domSlides, ss?.getAttribute('data-speed') || 3000);
        return;
      }

      if (!row) return;
      const mode = row?.mode || null;
      const s = row?.settings || {};
      if (mode === 'slideshow') {
        const slides = Array.isArray(s.slides) && s.slides.length ? s.slides : (domSlides || []);
        startSlideshow(hero, slides, s.speed || ss?.getAttribute('data-speed') || 3000);
      } else if (mode === 'image') {
        applyBackground(s.url || s.poster || null, hero);
      }
    }

    async function onUpdate(e: any) {
      try {
        const detail = e?.detail || {};
        const page = detail?.page;
        const mode = detail?.mode;
        const settings = detail?.settings || {};
        const hero = document.querySelector('[data-measure="hero"]') as HTMLElement | null;
        if (!hero) return;

        if (page) {
          if (mode === 'slideshow') {
            const slides = settings?.slides || null;
            const speed = settings?.speed || null;
            startSlideshow(hero, slides, speed || undefined);
            return;
          }

          if (mode === 'image') {
            if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
            const url = settings?.url || settings?.poster || '';
            applyBackground(url || null, hero);
            return;
          }

          if (mode === 'video') {
            if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
            return;
          }
        }

        if (mode === 'slideshow' || (settings && settings.slides && settings.slides.length)) {
          const slides = settings?.slides || null;
          const speed = settings?.speed || null;
          startSlideshow(hero, slides, speed || undefined);
        }
      } catch (err) { }
    }

    (async () => {
      try {
        const heroEl = document.querySelector('[data-measure="hero"]') as HTMLElement | null;
        const page = heroEl?.getAttribute('data-page') || null;
        if (page) await setupFromPage(page);
      } catch (_) {}
    })();

    window.addEventListener('hero-updated', onUpdate as EventListener);

    return () => {
      window.removeEventListener('hero-updated', onUpdate as EventListener);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      mounted = false;
    };
  }, []);

  return null;
}
