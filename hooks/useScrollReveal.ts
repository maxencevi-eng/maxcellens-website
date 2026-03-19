/**
 * useScrollReveal — Hook réutilisable pour les animations au scroll.
 *
 * Usage :
 *   const { ref, visible } = useScrollReveal();
 *   <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(28px)', transition: '600ms ease-out' }}>
 *
 * Avec stagger sur les enfants :
 *   const { ref: parentRef, visible } = useScrollReveal();
 *   // appliquer des animation-delay échelonnés sur les enfants
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  /** Fraction de l'élément visible avant de déclencher (défaut : 0.12) */
  threshold?: number;
  /** Ne déclencher qu'une seule fois (défaut : true) */
  once?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.12, once = true } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, visible };
}

/** Styles CSS inline pour l'état initial (avant révélation) */
export const revealInitialStyle: React.CSSProperties = {
  position: 'relative',
};

/** Styles CSS inline pour l'état final (révélé) */
export const revealVisibleStyle: React.CSSProperties = {
  position: 'relative',
};
