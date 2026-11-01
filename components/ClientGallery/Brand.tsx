"use client";

import React, { useEffect, useRef, useState } from 'react';
import styles from './ClientGallery.module.css';

/**
 * Logo du site, ou « Maxcellens » en texte s'il n'existe pas ou ne charge pas.
 *
 * tone : `light` = posé sur une photo (logo passé en blanc) ;
 *        `auto`  = posé sur le fond de page (blanc seulement en ambiance Nuit).
 *
 * Le fichier du logo peut contenir de larges marges transparentes (celui du
 * site fait 200×113 pour un dessin de 200×33). On mesure la zone réellement
 * dessinée au chargement et on recadre dessus, pour que la hauteur réglée en
 * CSS soit celle du logo visible, quel que soit le fichier utilisé.
 */
export default function Brand({
  logo,
  tone = 'auto',
  className,
  size = 'md',
}: {
  logo?: string | null;
  tone?: 'light' | 'auto';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const [crop, setCrop] = useState<React.CSSProperties | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  // L'image peut être chargée avant l'hydratation : onLoad ne se déclenche alors jamais
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth) measure(img);
  }, [logo]); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = (img: HTMLImageElement) => {
    try {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      if (!W || !H) return;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, W, H).data;
      let top = H, bottom = -1, left = W, right = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (px[(y * W + x) * 4 + 3] > 12) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      if (bottom < 0) return;
      const bw = right - left + 1;
      const bh = bottom - top + 1;
      if (bw >= W - 2 && bh >= H - 2) return; // pas de marge à retirer
      // object-position en % : aligne le point p% de l'image sur le point p% de la boîte
      const px_ = W > bw ? (left / (W - bw)) * 100 : 50;
      const py_ = H > bh ? (top / (H - bh)) * 100 : 50;
      setCrop({ aspectRatio: `${bw} / ${bh}`, objectFit: 'cover', objectPosition: `${px_}% ${py_}%` });
    } catch {
      /* image non lisible (CORS) : affichage sans recadrage */
    }
  };

  if (!logo || failed) return <div className={className}>Maxcellens</div>;
  return (
    <div className={className}>
      <img
        ref={ref}
        src={logo}
        alt="Maxcellens"
        crossOrigin="anonymous"
        className={styles.brandLogo}
        data-tone={tone}
        data-size={size}
        style={crop || undefined}
        onLoad={(e) => measure(e.currentTarget)}
        onError={() => setFailed(true)}
        draggable={false}
      />
    </div>
  );
}
