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
 * Mode "standard" : router.push lancé à la FIN de l'enter (comportement précédent).
 * Mode "seamless" : router.push lancé au DÉBUT de l'enter. Si la page est prête
 *   avant la fin de l'enter → exit s'enchaîne directement sans phase waiting.
 *
 * À la fin de l'exit : dispatch 'splash-dismissed' pour déclencher les
 * animations de blocs qui y sont abonnés (HomePageClient, AnimationPageClient…)
 */
type Phase = 'idle' | 'enter' | 'waiting' | 'exit';

export default function PageTransitionOverlay() {
  const { settings } = useTransitionSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const targetHref = useRef<string | null>(null);
  const prevPathname = useRef(pathname);
  // seamless: page prête (pathname changé) pendant la phase enter
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
      targetHref.current = href;
      pageReadyDuringEnter.current = false;

      if (settings.mode === 'seamless') {
        // Seamless : on navigue immédiatement pendant que l'overlay monte
        router.push(href);
        targetHref.current = null;
      }

      setPhase('enter');
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [settings.enabled, settings.mode, pathname, router]);

  // Quand pathname change : comportement selon la phase en cours
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;

      if (phase === 'enter' && settings.mode === 'seamless') {
        // Page prête pendant l'enter → on notera pour enchaîner l'exit dès la fin
        pageReadyDuringEnter.current = true;
      } else if (phase === 'waiting') {
        // Double rAF = s'assure que le DOM est peint avant de révéler
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase('exit');
          });
        });
      }
    }
  }, [pathname, phase, settings.mode]);

  // Safety : si pathname ne change pas dans les 4s (ex: navigation échouée)
  useEffect(() => {
    if (phase === 'waiting') {
      const timeout = setTimeout(() => setPhase('exit'), 4000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  const handleAnimationComplete = useCallback(() => {
    if (phase === 'enter') {
      if (settings.mode === 'seamless') {
        if (pageReadyDuringEnter.current) {
          // Page déjà chargée pendant l'enter → exit immédiat, sans waiting
          pageReadyDuringEnter.current = false;
          setPhase('exit');
        } else {
          // Page pas encore prête → on attend
          setPhase('waiting');
        }
      } else {
        // Standard : router.push ici, à la fin de l'enter
        if (targetHref.current) {
          router.push(targetHref.current);
          targetHref.current = null;
        }
        setPhase('waiting');
      }
    } else if (phase === 'exit') {
      setPhase('idle');
      // Notifie les blocs (HomePageClient, AnimationPageClient…) que la
      // transition est terminée → déclenche leurs animations d'entrée
      window.dispatchEvent(new CustomEvent('splash-dismissed'));
    }
  }, [phase, router, settings.mode]);

  if (!settings.enabled || phase === 'idle') return null;

  const animateY = phase === 'exit' ? '-100%' : '0%';

  return (
    <>
      {/* En mode seamless : fond instantané qui couvre tout l'écran dès le clic,
          empêche de voir la nouvelle page se rendre pendant que le wipe monte.
          Masqué pendant l'exit (le wipe couvre déjà tout l'écran). */}
      {settings.mode === 'seamless' && (phase === 'enter' || phase === 'waiting') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999998,
            background: settings.overlayColor,
            pointerEvents: 'all',
          }}
        />
      )}
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
    </>
  );
}
