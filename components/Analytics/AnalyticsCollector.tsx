'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import {
  trackPageview,
  trackClick,
  setPageEnterTime,
  getTimeOnPageSeconds,
  sendToCollect,
  buildPageviewPayload,
} from '../../lib/analyticsClient';

export default function AnalyticsCollector() {
  const pathname = usePathname();
  const pathRef = useRef<string | null>(null);
  const isAuthenticatedRef = useRef(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      isAuthenticatedRef.current = !!session?.user;
      setAuthChecked(true);
    }).catch(() => {
      if (!mounted) return;
      setAuthChecked(true);
    });
    const fallback = setTimeout(() => {
      if (!mounted) return;
      setAuthChecked((prev) => prev || true);
    }, 2000);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      isAuthenticatedRef.current = !!session?.user;
    });
    return () => {
      mounted = false;
      clearTimeout(fallback);
      try { (sub as any)?.subscription?.unsubscribe?.(); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !authChecked) return;
    if (isAuthenticatedRef.current) return; // Ne pas envoyer de pageview si connecté
    const path = pathname || window.location.pathname || '/';
    // En navigation in-app : envoyer le "leave" de la page précédente avec la durée avant de changer de page
    const prevPath = pathRef.current;
    if (prevPath != null && prevPath !== path) {
      const duration = getTimeOnPageSeconds();
      const payload = buildPageviewPayload(prevPath, duration, false);
      sendToCollect(payload, true);
    }
    setPageEnterTime();
    pathRef.current = path;
    trackPageview(path, undefined, false);
  }, [pathname, authChecked]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function sendLeave() {
      if (isAuthenticatedRef.current) return; // Ne pas envoyer si connecté
      const path = pathRef.current || window.location.pathname || '/';
      const duration = getTimeOnPageSeconds();
      const payload = buildPageviewPayload(path, duration, false);
      sendToCollect(payload, true);
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') sendLeave();
    }
    function onBeforeUnload() {
      sendLeave();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !authChecked) return; // Attendre la connaissance de l'auth avant d'écouter les clics
    function findClickableInPath(ev: MouseEvent): HTMLElement | null {
      const path = (ev as any).composedPath?.() as HTMLElement[] | undefined;
      if (Array.isArray(path)) {
        for (const node of path) {
          if (!node || typeof node.tagName !== 'string') continue;
          const tag = (node as HTMLElement).tagName?.toUpperCase();
          if (tag === 'A') return node as HTMLElement;
          if (tag === 'BUTTON') return node as HTMLElement;
          if ((node as HTMLElement).getAttribute?.('role') === 'button') return node as HTMLElement;
          if ((node as HTMLElement).getAttribute?.('data-analytics-id')) return node as HTMLElement;
          if (tag === 'IMG') return (node as HTMLElement).closest?.('a') || (node as HTMLElement);
        }
      }
      const target = ev.target as HTMLElement;
      if (!target) return null;
      const link = target.closest?.('a');
      if (link) return link as HTMLElement;
      const btn = target.closest?.('button') || target.closest?.('[role="button"]');
      if (btn) return btn as HTMLElement;
      return target;
    }
    function getElementTypeAndDetail(el: HTMLElement): string {
      const dataId = el.getAttribute?.('data-analytics-id') || el.closest?.('[data-analytics-id]')?.getAttribute?.('data-analytics-id');
      if (dataId) return `id|${dataId}`;
      const link = el.tagName === 'A' ? (el as HTMLAnchorElement) : el.closest?.('a');
      if (link) {
        const anchor = link as HTMLAnchorElement;
        const rawHref = (anchor.getAttribute?.('href') ?? '').trim();
        const resolvedHref = anchor.href || rawHref || '';
        const href = resolvedHref;
        const text = (link as HTMLElement).textContent?.trim().slice(0, 80) || (link as HTMLElement).innerText?.trim().slice(0, 80) || '';
        if (/^mailto:/i.test(rawHref) || /^mailto:/i.test(href)) return `lien externe|email${text ? ` — ${text}` : ''}`;
        try {
          const base = typeof window !== 'undefined' ? window.location.origin : '';
          const url = href.startsWith('http') ? new URL(href) : new URL(href, base || 'http://localhost');
          const pathname = url.pathname?.replace(/\/+$/, '') || '/';
          const pageLabel = pathname === '/' ? 'Accueil' : pathname.slice(1).split('/')[0] || 'Lien';
          const inNav = link.closest?.('nav') || link.closest?.('[role="navigation"]');
          // Interne = attribut href relatif OU même site (host normalisé : www, localhost/127.0.0.1)
          const isRelativePath = !rawHref || rawHref.startsWith('#') || (rawHref.startsWith('/') && !rawHref.startsWith('//')) || rawHref.startsWith('.');
          const normalizeHost = (h: string) => {
            const s = (h ?? '').replace(/^www\./, '').toLowerCase();
            if (s === '127.0.0.1' || s === 'localhost' || s === '[::1]') return '__local';
            return s;
          };
          let isInternal = isRelativePath;
          if (!isInternal && typeof window !== 'undefined') {
            const linkHost = normalizeHost(url.hostname ?? '');
            const pageHost = normalizeHost(window.location.hostname ?? '');
            isInternal = linkHost === pageHost;
          }
          // Pour les liens externes : identifier les réseaux sociaux par domaine pour afficher Instagram, Facebook, etc.
          const host = (url.hostname ?? '').replace(/^www\./, '').toLowerCase();
          const socialLabel =
            /instagram\.com/i.test(host) ? 'Instagram' :
            /facebook\.com|fb\.com|fb\.me/i.test(host) ? 'Facebook' :
            /youtube\.com|youtu\.be/i.test(host) ? 'YouTube' :
            /tiktok\.com/i.test(host) ? 'TikTok' :
            /linkedin\.com/i.test(host) ? 'LinkedIn' :
            /twitter\.com|x\.com/i.test(host) ? 'Twitter / X' :
            /vimeo\.com/i.test(host) ? 'Vimeo' :
            /pinterest\.com/i.test(host) ? 'Pinterest' :
            /snapchat\.com/i.test(host) ? 'Snapchat' :
            null;
          const label = socialLabel ?? text ?? pageLabel;
          const linkType = isInternal ? 'lien interne' : 'lien externe';
          const inMobileDrawer = inNav && (link as HTMLElement).closest?.('nav[data-mobile-drawer="true"]');
          return inMobileDrawer ? `menu mobile|${label}` : inNav ? `menu|${label}` : `${linkType}|${label}`;
        } catch (_) {}
        return `lien externe|${text || 'Lien'}`;
      }
      const button = el.tagName === 'BUTTON' ? el : el.closest?.('button') || el.closest?.('[role="button"]');
      if (button) {
        const btnEl = button as HTMLElement;
        const ariaLabel = btnEl.getAttribute?.('aria-label')?.trim().toLowerCase() || '';
        const btnClass = (typeof btnEl.className === 'string' ? btnEl.className : '') || '';
        const hasHamburger = btnEl.querySelector?.('[class*="hamburger"]') || /hamburger|menuButton|menu-button/i.test(btnClass);
        if (ariaLabel === 'menu' || (hasHamburger && !btnEl.textContent?.trim())) {
          return 'menu mobile|';
        }
        const text = btnEl.textContent?.trim().slice(0, 80) || (btnEl as HTMLButtonElement).innerText?.trim().slice(0, 80) || (button as HTMLButtonElement).value || 'Bouton';
        const inNav = button.closest?.('nav') || button.closest?.('[role="navigation"]');
        const inMobileDrawer = inNav && (button as HTMLElement).closest?.('nav[data-mobile-drawer="true"]');
        return inMobileDrawer ? `menu mobile|${text}` : inNav ? `menu|${text}` : `bouton|${text}`;
      }
      const img = el.tagName === 'IMG' ? el : el.querySelector?.('img');
      if (img) {
        const alt = (img as HTMLImageElement).alt?.trim().slice(0, 60);
        const inGallery = el.closest?.('[class*="gallery"]') || el.closest?.('[class*="Gallery"]') || el.closest?.('[class*="masonry"]');
        const type = inGallery ? 'image galerie' : 'image';
        return `${type}|${alt || 'Image'}`;
      }
      const inNav = el.closest?.('nav') || el.closest?.('[role="navigation"]');
      if (inNav) {
        const text = (el as HTMLElement).textContent?.trim().slice(0, 60) || (el as HTMLElement).innerText?.trim().slice(0, 60) || 'Menu';
        const inMobileDrawer = (el as HTMLElement).closest?.('nav[data-mobile-drawer="true"]');
        return inMobileDrawer ? `menu mobile|${text}` : `menu|${text}`;
      }
      const cls = el.className && typeof el.className === 'string' ? el.className : '';
      if (/admin|bloc|edit|modifier|visibility|width|order/i.test(cls) || el.closest?.('[class*="BlockVisibility"]')) {
        const text = (el as HTMLElement).textContent?.trim().slice(0, 60) || (el as HTMLElement).innerText?.trim().slice(0, 60) || 'Bloc';
        return `bouton bloc|${text}`;
      }
      if (/btn|button/i.test(cls)) {
        const text = (el as HTMLElement).textContent?.trim().slice(0, 60) || (el as HTMLElement).innerText?.trim().slice(0, 60) || 'Bouton';
        return `bouton|${text}`;
      }
      const text = (el as HTMLElement).textContent?.trim().slice(0, 60) || (el as HTMLElement).innerText?.trim().slice(0, 60);
      return text ? `élément|${text}` : 'inconnu|';
    }
    function handleClick(e: MouseEvent) {
      if (isAuthenticatedRef.current) return; // Ne pas enregistrer les clics si connecté
      const path = window.location.pathname || '/';
      const clickable = findClickableInPath(e);
      if (!clickable) return;
      const typeDetail = getElementTypeAndDetail(clickable);
      trackClick(path, typeDetail, {}, false);
    }
    document.addEventListener('click', handleClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [authChecked]);

  return null;
}
