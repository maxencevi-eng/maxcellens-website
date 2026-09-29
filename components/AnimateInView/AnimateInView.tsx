"use client";

import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";

/**
 * Fin de l'écran de chargement (splash ou transition de page).
 *
 * Le signal `splash-dismissed` est un évènement ponctuel : un composant monté
 * APRÈS lui (bloc chargé en différé, par ex. l'intro de l'accueil) ne le
 * recevait jamais et restait invisible. Les émetteurs posent donc aussi
 * `window.__splashDismissed`, lu ici au montage.
 */
export function markSplashDismissed() {
  if (typeof window === 'undefined') return;
  (window as any).__splashDismissed = true;
  window.dispatchEvent(new CustomEvent('splash-dismissed'));
}

export function isSplashDismissed(): boolean {
  return typeof window !== 'undefined' && (window as any).__splashDismissed === true;
}

export function useSplashReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (isSplashDismissed()) { setReady(true); return; }
    const handler = () => setReady(true);
    window.addEventListener('splash-dismissed', handler, { once: true });
    // Filet de sécurité : jamais de contenu bloqué si le signal se perd.
    const safety = setTimeout(() => setReady(true), 4000);
    return () => { window.removeEventListener('splash-dismissed', handler); clearTimeout(safety); };
  }, []);
  return ready;
}

/** Défaut : déclenche dès qu’une partie du bloc est visible (20 % + marge réduite), pour que l’intro s’anime sur mobile sans forcer à scroller */
const defaultViewport = { once: true, amount: 0, margin: "0px 0px -40px 0px" };
/** Galeries / blocs longs : déclenche dès qu’un peu du bloc est visible (évite bloc invisible) */
const soonViewport = { once: true, amount: 0.05, margin: "0px" };
const transition = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const };

export const variants: Record<string, Variants> = {
  /** Texte : fondu + léger slide du bas */
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  /** Texte : fondu seul */
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  /** Image : fondu + slide du haut vers le bas (entrée douce) */
  slideDown: {
    hidden: { opacity: 0, y: -24 },
    visible: { opacity: 1, y: 0 },
  },
  /** Image : fondu + slide du bas (plus marqué) */
  slideUp: {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  /** Contenu : entrée depuis la gauche */
  slideFromLeft: {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  /** Contenu : entrée depuis la droite */
  slideFromRight: {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
  /** Carte / bloc : léger scale + fondu */
  scaleIn: {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1 },
  },
  /** Enfants décalés (stagger) : le parent utilise staggerChildren */
  stagger: {
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
    hidden: {},
  },
  staggerItem: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
};

export type AnimateVariant = keyof typeof variants;

type Props = {
  variant?: AnimateVariant;
  children: React.ReactNode;
  as?: keyof typeof motion;
  className?: string;
  style?: React.CSSProperties;
  /** Délai en secondes avant le début de l’animation */
  delay?: number;
  /** Si true, déclenche l’animation dès qu’un peu du bloc est visible (pour galeries / longs blocs) */
  viewportSoon?: boolean;
  /** Options de déclenchement viewport manuelles (ex. { once: true, amount: 0}) - écrase viewportSoon */
  viewport?: any;
  /** État initial de l’animation (ex. "visible" pour désactiver l'animation d'entrée) */
  initial?: string | boolean | any;
};

export default function AnimateInView({
  variant = "fadeUp",
  children,
  as = "div",
  className,
  style,
  delay = 0,
  viewportSoon = false,
  viewport: manualViewport,
  initial = "hidden",
}: Props) {
  const splashReady = useSplashReady();
  const Component = motion[as] as typeof motion.div;
  const v = variants[variant];
  const isStagger = variant === "stagger";
  const viewport = manualViewport || (viewportSoon ? soonViewport : defaultViewport);

  // Block animations until the page transition overlay has exited.
  // Only applies when initial="hidden" (i.e. the animation is intended to play).
  if (!splashReady && initial === "hidden") {
    return (
      <Component
        initial="hidden"
        animate="hidden"
        variants={v}
        className={className}
        style={style}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component
      initial={initial}
      whileInView="visible"
      viewport={viewport}
      variants={v}
      transition={
        isStagger
          ? { staggerChildren: 0.08, delayChildren: 0.05 }
          : { ...transition, delay }
      }
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

/** Enfant pour stagger : à utiliser à l’intérieur d’AnimateInView variant="stagger" */
export function AnimateStaggerItem({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={variants.staggerItem}
      transition={transition}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
