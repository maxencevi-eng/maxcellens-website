"use client";

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Piège le focus dans `ref` tant que `active` est vrai, puis rend le focus à
 * l'élément qui avait le focus avant l'ouverture.
 *
 * L'ancien `Modal` ne faisait rien de tout ça : Tab sortait de la modale et
 * atterrissait sur la page derrière, invisible pour l'utilisateur au clavier.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    if (!node) return;

    // Focus initial : premier élément focusable, sinon le conteneur lui-même.
    const focusFirst = () => {
      const items = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      // On saute le bouton de fermeture pour ne pas ouvrir sur « Fermer »
      const preferred = Array.from(items).find((el) => !el.hasAttribute('data-adm-close'));
      (preferred || items[0] || node).focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const node = ref.current;
      if (!node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!node.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const prev = previouslyFocused.current;
      if (prev && document.contains(prev)) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    };
  }, [active]);

  return ref;
}

export default useFocusTrap;
