"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTransitionSettings } from './TransitionProvider';

/**
 * Phase machine:
 *   idle → enter (overlay slides up from bottom)
 *        → waiting (overlay covers viewport, router.push fires)
 *        → exit (overlay slides up out of viewport)
 *        → idle
 */
type Phase = 'idle' | 'enter' | 'waiting' | 'exit';

export default function PageTransitionOverlay() {
  const { settings } = useTransitionSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const targetHref = useRef<string | null>(null);
  const prevPathname = useRef(pathname);

  const halfDuration = settings.duration / 2;

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
      setPhase('enter');
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [settings.enabled, pathname]);

  // When pathname changes (new page loaded), start exit animation
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (phase === 'waiting') {
        setPhase('exit');
      }
    }
  }, [pathname, phase]);

  // Safety timeout: if pathname doesn't change within 3s, force exit
  useEffect(() => {
    if (phase === 'waiting') {
      const timeout = setTimeout(() => setPhase('exit'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  const handleAnimationComplete = useCallback(() => {
    if (phase === 'enter') {
      // Overlay now fully covers viewport → navigate
      if (targetHref.current) {
        router.push(targetHref.current);
        targetHref.current = null;
      }
      setPhase('waiting');
    } else if (phase === 'exit') {
      setPhase('idle');
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
      transition={{ duration: halfDuration, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={handleAnimationComplete}
    />
  );
}
