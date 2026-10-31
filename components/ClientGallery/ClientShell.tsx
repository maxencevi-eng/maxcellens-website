"use client";

import React, { useEffect } from 'react';
import type { FontPair, Theme } from '../../lib/clientGalleries/types';
import styles from './ClientGallery.module.css';

/**
 * Couche plein écran des pages client : masque le site derrière, porte
 * l'ambiance (couleurs) et la paire de polices choisies dans l'admin.
 */
export default function ClientShell({
  theme = 'light',
  font = 'serif',
  children,
  scrollRef,
}: {
  theme?: Theme;
  font?: FontPair;
  children: React.ReactNode;
  scrollRef?: React.Ref<HTMLDivElement>;
}) {
  useEffect(() => {
    // La page du site (vide) ne doit pas défiler sous la couche
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  return (
    <div ref={scrollRef} className={styles.root} data-theme={theme} data-font={font} data-no-transition>
      {font === 'serif' ? (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap"
          precedence="default"
        />
      ) : null}
      {children}
    </div>
  );
}
