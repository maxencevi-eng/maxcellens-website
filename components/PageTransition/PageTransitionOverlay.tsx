"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, type Transition } from 'framer-motion';
import { useTransitionSettings } from './TransitionProvider';
import {
  EASE_COVER,
  EASE_REVEAL,
  phaseDurations,
  type TransitionStyle,
} from './transitionSettings';
import { decideLink, scrollTargetForTab } from './linkTarget';
import styles from './PageTransitionOverlay.module.css';

/**
 * Machine à états :
 *   idle → covering (l'overlay recouvre l'écran)
 *        → covered  (l'overlay couvre, on attend la page destination)
 *        → revealing (l'overlay se retire, la nouvelle page apparaît)
 *        → idle
 *
 * Différence majeure avec la version précédente : `router.push()` est appelé
 * DÈS LE CLIC, plus à la fin du recouvrement. Le chargement réseau et
 * l'animation se déroulent donc en parallèle. Combiné au préchargement au
 * survol, la phase `covered` est le plus souvent nulle.
 *
 * À la fin de la révélation : `splash-dismissed` déclenche les animations de
 * blocs (HomePageClient, AnimationPageClient…).
 */
type Phase = 'idle' | 'covering' | 'covered' | 'revealing';

/** Au-delà de ce délai d'attente, on affiche un indicateur de chargement. */
const PROGRESS_AFTER_MS = 400;

export default function PageTransitionOverlay() {
  const { settings } = useTransitionSettings();
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<Phase>('idle');
  const [showProgress, setShowProgress] = useState(false);
  const prevPathname = useRef(pathname);
  /** Vrai si la destination est rendue avant la fin du recouvrement. */
  const pageReady = useRef(false);
  /** Destination mémorisée au clic, navigée une fois l'écran couvert. */
  const targetHref = useRef<string | null>(null);
  /** Horodatage du début du recouvrement, pour la durée minimale. */
  const coverStartedAt = useRef(0);
  const prefetched = useRef<Set<string>>(new Set());
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const { cover: coverDuration, reveal: revealDuration } = phaseDurations(settings.duration);

  /** Passe à la révélation, en respectant la durée minimale de recouvrement. */
  const startReveal = useCallback(() => {
    const elapsed = Date.now() - coverStartedAt.current;
    const remaining = Math.max(0, settings.minCover * 1000 - elapsed);
    const go = () => {
      // Double rAF : garantit que la nouvelle page est peinte avant qu'on ne
      // découvre l'écran, sinon on révèle un fond vide.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setShowProgress(false);
          setPhase('revealing');
        });
      });
    };
    if (remaining > 0) setTimeout(go, remaining);
    else go();
  }, [settings.minCover]);

  /* ── Préchargement à l'intention ────────────────────────────────────────
     Le handler de clic appelle router.push(), ce qui court-circuite le
     préchargement automatique de <Link>. On le refait donc explicitement au
     survol / au toucher : c'est ce qui supprime le temps mort. */
  useEffect(() => {
    if (!settings.enabled || !settings.prefetch) return;

    function maybePrefetch(e: Event) {
      const link = (e.target as Element | null)?.closest?.('a');
      if (!link) return;
      const decision = decideLink(link as HTMLAnchorElement, new MouseEvent('click'), pathname || '/');
      if (decision.kind !== 'navigate') return;
      if (prefetched.current.has(decision.href)) return;
      prefetched.current.add(decision.href);
      try { router.prefetch(decision.href); } catch (_) {}
    }

    document.addEventListener('mouseover', maybePrefetch, { passive: true });
    document.addEventListener('touchstart', maybePrefetch, { passive: true });
    document.addEventListener('focusin', maybePrefetch, { passive: true });
    return () => {
      document.removeEventListener('mouseover', maybePrefetch);
      document.removeEventListener('touchstart', maybePrefetch);
      document.removeEventListener('focusin', maybePrefetch);
    };
  }, [settings.enabled, settings.prefetch, pathname, router]);

  /* ── Interception des clics ─────────────────────────────────────────── */
  useEffect(() => {
    if (!settings.enabled) return;

    function handleClick(e: MouseEvent) {
      // defaultPrevented : un autre handler a déjà pris la main
      if (e.defaultPrevented) return;
      const link = (e.target as Element | null)?.closest?.('a');
      if (!link) return;

      const decision = decideLink(link as HTMLAnchorElement, e, pathname || '/');
      if (decision.kind === 'ignore') return;

      if (decision.kind === 'sameTab') {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('spa-same-page-tab', { detail: { tab: decision.tab } })
        );
        requestAnimationFrame(() => {
          document.getElementById(decision.scrollId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        });
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (decision.tab) {
        try {
          sessionStorage.setItem('spaTabTarget', decision.tab);
          const scrollId = scrollTargetForTab(new URL(decision.href, window.location.origin).pathname);
          if (scrollId && !sessionStorage.getItem('spaScrollTarget')) {
            sessionStorage.setItem('spaScrollTarget', scrollId);
          }
        } catch (_) {}
      }

      pageReady.current = false;
      coverStartedAt.current = Date.now();
      // La navigation n'est PAS lancée ici.
      //
      // Le volet monte du bas : tant qu'il n'a pas atteint le haut de l'écran,
      // une partie de la page reste visible. Naviguer au clic faisait donc
      // apparaître la nouvelle page dans cette bande encore découverte.
      // On mémorise la destination et on navigue une fois l'écran couvert.
      //
      // Le coût est nul : la route a déjà été préchargée au survol du lien
      // (voir l'effet de préchargement ci-dessus), `router.push` est donc
      // quasi instantané à ce moment-là.
      targetHref.current = decision.href;
      setPhase('covering');
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [settings.enabled, pathname, router]);

  /* ── Arrivée de la nouvelle route ───────────────────────────────────── */
  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    // La navigation n'est lancée qu'une fois l'écran couvert : un changement
    // de pathname pendant `covering` ne peut donc venir que d'une navigation
    // externe (bouton Précédent). On laisse la machine suivre son cours.
    if (phase === 'covered') startReveal();
  }, [pathname, phase, startReveal]);

  /* ── Attente : indicateur puis ouverture forcée ─────────────────────── */
  useEffect(() => {
    if (phase !== 'covered') {
      setShowProgress(false);
      return;
    }
    const progressTimer = settings.showProgress
      ? setTimeout(() => setShowProgress(true), PROGRESS_AFTER_MS)
      : null;
    const maxWaitTimer = setTimeout(() => {
      startReveal();
    }, Math.round(settings.maxWait * 1000));

    return () => {
      if (progressTimer) clearTimeout(progressTimer);
      clearTimeout(maxWaitTimer);
    };
  }, [phase, settings.maxWait, settings.showProgress, startReveal]);

  const onAnimationComplete = useCallback(() => {
    if (phase === 'covering') {
      // L'écran est entièrement couvert : c'est seulement maintenant que la
      // navigation peut avoir lieu sans que le changement de page se voie.
      if (targetHref.current) {
        router.push(targetHref.current);
        targetHref.current = null;
      }
      setPhase('covered');
    } else if (phase === 'revealing') {
      setPhase('idle');
      window.dispatchEvent(new CustomEvent('splash-dismissed'));
    }
  }, [phase, router]);

  if (!settings.enabled || phase === 'idle') return null;

  const revealing = phase === 'revealing';
  const style: TransitionStyle = reducedMotion.current ? 'fade' : settings.style;
  const frames = getFrames(style);

  const transition: Transition = reducedMotion.current
    ? { duration: 0.12, ease: 'linear' }
    : {
        duration: revealing ? revealDuration : coverDuration,
        ease: revealing ? EASE_REVEAL : EASE_COVER,
      };

  return (
    <motion.div
      className={styles.overlay}
      style={{ background: settings.overlayColor }}
      initial={frames.initial}
      animate={revealing ? frames.reveal : frames.cover}
      transition={transition}
      onAnimationComplete={onAnimationComplete}
      // pointer-events fixe : le basculement en cours d'animation provoquait
      // des clics traversants au moment exact du changement de phase.
      aria-hidden="true"
    >
      {showProgress ? (
        <span className={styles.progress}>
          <span className={styles.progressBar} />
        </span>
      ) : null}
    </motion.div>
  );
}

type Frames = {
  initial: Record<string, string | number>;
  cover: Record<string, string | number>;
  reveal: Record<string, string | number>;
};

/**
 * Images-clés par style. Toutes les propriétés animées sont composées par le
 * GPU (transform / opacity / clip-path) — aucune ne déclenche de reflow.
 */
function getFrames(style: TransitionStyle): Frames {
  switch (style) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        cover: { opacity: 1 },
        reveal: { opacity: 0 },
      };
    case 'slide':
      return {
        initial: { x: '100%' },
        cover: { x: '0%' },
        reveal: { x: '-100%' },
      };
    case 'mask':
      return {
        initial: { clipPath: 'circle(0% at 50% 50%)' },
        cover: { clipPath: 'circle(75% at 50% 50%)' },
        reveal: { clipPath: 'circle(0% at 50% 50%)' },
      };
    case 'curtain':
    default:
      return {
        initial: { y: '100%' },
        cover: { y: '0%' },
        reveal: { y: '-100%' },
      };
  }
}

export { getFrames };
