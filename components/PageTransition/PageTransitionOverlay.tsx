"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTransitionSettings } from './TransitionProvider';

/**
 * Phase machine:
 *   idle → enter  (overlay monte du bas, couvre l'écran)
 *        → waiting (overlay couvre, attend la page destination)
 *        → exit   (overlay monte vers le haut, révèle la nouvelle page)
 *        → idle
 *
 * Mode "standard" : router.push lancé à la FIN de l'enter.
 * Mode "seamless" : router.push lancé au DÉBUT de l'enter (page charge en
 *   background pendant que l'overlay monte). Si la page est prête avant la
 *   fin de l'enter → exit s'enchaîne directement sans phase waiting.
 *
 * À la fin de l'exit : dispatch 'splash-dismissed' pour déclencher les
 * animations de blocs (HomePageClient, AnimationPageClient…)
 */
type Phase = 'idle' | 'enter' | 'waiting' | 'exit';

export default function PageTransitionOverlay() {
  const { settings } = useTransitionSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const targetHref = useRef<string | null>(null);
  const prevPathname = useRef(pathname);
  // seamless : true si le pathname a changé pendant la phase enter
  const pageReadyDuringEnter = useRef(false);

  const enterDuration = settings.duration * 0.55;
  const exitDuration  = settings.duration * 0.65;

  // Intercept internal link clicks
  useEffect(() => {
    if (!settings.enabled) return;

    function handleClick(e: MouseEvent) {
      const link = (e.target as Element).closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Skip external, anchor, mailto, tel links
      if (/^(https?:|mailto:|tel:|#)/.test(href)) return;
      // Skip new-tab / modifier-key navigations
      if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // Same page — no transition needed
      if (href === pathname) return;

      e.preventDefault();
      e.stopPropagation();

      pageReadyDuringEnter.current = false;

      // Strip ?tab= from URL, store in sessionStorage for SubmenuPageClient/PortraitPageClient
      let cleanHref = href;
      let isSamePageTabSwitch = false;
      try {
        const url = new URL(href, window.location.origin);
        const tab = url.searchParams.get('tab');
        if (tab) {
          url.searchParams.delete('tab');
          const strippedPath = url.pathname + (url.search !== '?' ? url.search : '') + url.hash;

          if (strippedPath === pathname) {
            // Même page — pas de navigation, juste switcher l'onglet et scroller
            isSamePageTabSwitch = true;
            window.dispatchEvent(new CustomEvent('spa-same-page-tab', { detail: { tab } }));
            const submenuPages = ['/corporate', '/realisation', '/evenement'];
            const scrollId = submenuPages.includes(url.pathname)
              ? 'submenu-gallery-nav'
              : 'portrait-gallery-nav';
            requestAnimationFrame(() => {
              const el = document.getElementById(scrollId);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          } else {
            sessionStorage.setItem('spaTabTarget', tab);
            // Auto scroll-to-nav for pages using SubmenuPageClient (film/photo tabs)
            const submenuPages = ['/corporate', '/realisation', '/evenement'];
            if (submenuPages.includes(url.pathname) && !sessionStorage.getItem('spaScrollTarget')) {
              sessionStorage.setItem('spaScrollTarget', 'submenu-gallery-nav');
            }
            cleanHref = strippedPath;
          }
        }
      } catch (_) {}

      if (isSamePageTabSwitch) return;

      if (settings.mode === 'seamless') {
        router.push(cleanHref);
      } else {
        targetHref.current = cleanHref;
      }

      setPhase('enter');
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [settings.enabled, settings.mode, pathname, router]);

  // Quand pathname change (Next.js a rendu la nouvelle route)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;

      if (phase === 'enter' && settings.mode === 'seamless') {
        // Page prête pendant l'enter → on le note, l'exit s'enchaînera dès la fin
        pageReadyDuringEnter.current = true;
      } else if (phase === 'waiting') {
        // Double rAF : garantit que le DOM est peint avant de révéler
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            setPhase('exit');
          });
        });
      }
    }
  }, [pathname, phase, settings.mode]);

  // Délai max configurable — ouvre la page même si elle n'est pas encore prête
  useEffect(() => {
    if (phase === 'waiting') {
      const ms = Math.round((settings.maxWait ?? 2) * 1000);
      const timeout = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        setPhase('exit');
      }, ms);
      return () => clearTimeout(timeout);
    }
  }, [phase, settings.maxWait]);

  const handleAnimationComplete = useCallback(() => {
    if (phase === 'enter') {
      if (settings.mode === 'seamless') {
        if (pageReadyDuringEnter.current) {
          // Page déjà rendue pendant l'enter → exit immédiat, sans waiting
          pageReadyDuringEnter.current = false;
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setPhase('exit');
        } else {
          // Page pas encore prête → on attend le changement de pathname
          setPhase('waiting');
        }
      } else {
        // Standard : router.push ici, overlay couvre tout l'écran
        if (targetHref.current) {
          router.push(targetHref.current);
          targetHref.current = null;
        }
        setPhase('waiting');
      }
    } else if (phase === 'exit') {
      setPhase('idle');
      window.dispatchEvent(new CustomEvent('splash-dismissed'));
    }
  }, [phase, router, settings.mode]);

  if (!settings.enabled || phase === 'idle') return null;

  const animateY = phase === 'exit' ? '-100%' : '0%';

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: settings.overlayColor,
        pointerEvents: phase === 'enter' || phase === 'waiting' ? 'all' : 'none',
      }}
      initial={{ y: '100%' }}
      animate={{ y: animateY }}
      transition={{
        duration: phase === 'exit' ? exitDuration : enterDuration,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onAnimationComplete={handleAnimationComplete}
    />
  );
}
