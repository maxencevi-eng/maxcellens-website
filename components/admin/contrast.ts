/**
 * Contraste WCAG 2.1 — utilisé par ColorField et par l'éditeur de style pour
 * signaler les combinaisons illisibles avant qu'elles ne partent en production.
 */

export type Rgb = { r: number; g: number; b: number };

/** Accepte #rgb, #rrggbb, et rgb()/rgba(). Renvoie null si non interprétable. */
export function parseColor(input: string | undefined | null): Rgb | null {
  if (!input) return null;
  const s = String(input).trim();

  const hex = s.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) {
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }
  return null;
}

/** Luminance relative WCAG. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio de contraste entre deux couleurs, de 1 à 21. null si non calculable. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export type ContrastVerdict = 'pass' | 'warn' | 'fail';

/**
 * Verdict pour du texte courant :
 *   ≥ 4.5 → AA         (pass)
 *   ≥ 3   → AA gros    (warn — acceptable pour les grands titres uniquement)
 *   < 3   → insuffisant (fail)
 */
export function contrastVerdict(ratio: number): ContrastVerdict {
  if (ratio >= 4.5) return 'pass';
  if (ratio >= 3) return 'warn';
  return 'fail';
}

/** Noir ou blanc, selon ce qui se lit le mieux sur `background`. */
export function readableInk(background: string): '#000000' | '#ffffff' {
  const c = parseColor(background);
  if (!c) return '#000000';
  return luminance(c) > 0.45 ? '#000000' : '#ffffff';
}
