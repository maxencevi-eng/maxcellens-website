"use client";
import React from 'react';
import type { ViewBlock } from '../types';
import styles from './blocks.module.css';

export default function ViewLinkBlock({ block }: { block: ViewBlock }) {
  const url = block.url || '#';
  const title = block.linkTitle || block.url || '';
  const description = block.linkDescription || '';
  const favicon = block.linkFaviconUrl || null;
  const image = block.linkImageUrl || null;
  const isCompact = block.size === 'compact';

  const displayUrl = (() => {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch (_) {
      return url;
    }
  })();

  // Fix 2: compact shows thumbnail on left side (if available), otherwise favicon
  if (isCompact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.linkCompact}
        style={{ color: block.textColor || undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.linkCompactThumb}>
          {image ? (
            <img src={image} alt="" className={styles.linkCompactImg} />
          ) : favicon ? (
            <img src={favicon} alt="" className={styles.linkFavicon} width={20} height={20} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          )}
        </div>
        <div className={styles.linkCompactBody}>
          <span className={styles.linkTitle}>{title}</span>
          <span className={styles.linkUrl}>{displayUrl}</span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.linkBlock}
      style={{ color: block.textColor || undefined }}
      onClick={(e) => e.stopPropagation()}
    >
      {image && (
        <div className={styles.linkImage}>
          <img src={image} alt="" />
        </div>
      )}
      <div className={styles.linkBody}>
        <div className={styles.linkMeta}>
          {favicon && (
            <img src={favicon} alt="" className={styles.linkFavicon} width={16} height={16} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span className={styles.linkTitle}>{title}</span>
        </div>
        {description && <span className={styles.linkDescription}>{description}</span>}
        <span className={styles.linkUrl}>{displayUrl}</span>
      </div>
    </a>
  );
}
