"use client";

import React from 'react';
import styles from './Clients.module.css';

type Props = {
  logos?: string[];
  title?: string;
};

function makePlaceholder(text: string, w = 160, h = 60) {
  const bg = '#f3f4f6';
  const fg = '#999999';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect fill='${bg}' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='${fg}' font-size='14' font-family='Arial,Helvetica,sans-serif'>${text}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const defaultLogos = [
  makePlaceholder('Logo 1'),
  makePlaceholder('Logo 2'),
  makePlaceholder('Logo 3'),
  makePlaceholder('Logo 4'),
  makePlaceholder('Logo 5'),
  makePlaceholder('Logo 6'),
  makePlaceholder('Logo 7'),
  makePlaceholder('Logo 8'),
  makePlaceholder('Logo 9'),
  makePlaceholder('Logo 10'),
];

export default function Clients({ logos, title }: Props) {
  const items = logos && logos.length ? logos : defaultLogos;

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.inner}>
          <h2 className={styles.title}>{title || 'CLIENTS ET PARTENAIRES PROFESSIONNELS'}</h2>
          <div className={styles.grid}>
            {items.map((src, i) => (
              <div key={i} className={styles.item}>
                <img
                  src={src}
                  alt={`client-${i}`}
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    // fallback to an inline SVG data URI to avoid external requests
                    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><rect fill='%23f3f4f6' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'>Logo</text></svg>`;
                    el.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
                    el.onerror = null;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
