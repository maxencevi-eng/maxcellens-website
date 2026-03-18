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

      if (settings.mode === 'seamless') {
        // Seamless : prefetch pendant que l'overlay monte,
        // router.push sera lancé à la fin de l'enter (comme standard).
        // La page étant déjà chargée en mémoire, la phase waiting sera
        // quasi nulle et l'exit s'enchaîne immédiatement.
        router.prefetch(href);
      }

      setPhase('enter');
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [settings.enabled, settings.mode, pathname, router]);

  // Quand pathname change (Next.js a rendu la nouvelle route côté client),
  // on attend 2 frames pour que React peigne la page, puis on lance l'exit.
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (phase === 'waiting') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase('exit');
          });
        });
      }
    }
  }, [pathname, phase]);

  // Safety : si pathname ne change pas dans les 4s (ex: navigation échouée)
  useEffect(() => {
    if (phase === 'waiting') {
      const timeout = setTimeout(() => setPhase('exit'), 4000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  const handleAnimationComplete = useCallback(() => {
    if (phase === 'enter') {
      // Dans les deux modes, router.push se fait ici (overlay couvre tout l'écran).
      // En mode seamless, la page a été prefetchée pendant l'enter → waiting minimal.
      if (targetHref.current) {
        router.push(targetHref.current);
        targetHref.current = null;
      }
      setPhase('waiting');
    } else if (phase === 'exit') {
      setPhase('idle');
      // Notifie les blocs (HomePageClient, AnimationPageClient…) que la
      // transition est terminée → déclenche leurs animations d'entrée
      window.dispatchEvent(new CustomEvent('splash-dismissed'));
    }
  }, [phase, router]);

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
