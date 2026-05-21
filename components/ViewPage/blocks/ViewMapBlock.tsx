"use client";
import React, { useEffect, useState } from 'react';
import type { ViewBlock } from '../types';
import styles from './blocks.module.css';

function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|Twitter|Snapchat/i.test(navigator.userAgent);
}

export default function ViewMapBlock({ block }: { block: ViewBlock }) {
  const query = block.mapQuery?.trim() || '';
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) setBlocked(true);
  }, []);

  if (!query) {
    return (
      <div className={styles.mapEmpty}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={32} height={32}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
        <span>Carte</span>
      </div>
    );
  }

  const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}`;

  if (blocked) {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mapFallback}
        style={{ color: block.textColor || undefined }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={30} height={30}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <span className={styles.mapFallbackLabel}>{query}</span>
        <span className={styles.mapFallbackCta}>Ouvrir dans Maps →</span>
      </a>
    );
  }

  return (
    <iframe
      className={styles.mapIframe}
      src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
      title="Carte"
      loading="lazy"
    />
  );
}
