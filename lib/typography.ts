/**
 * Système typographique du site — source unique partagée par le serveur
 * (app/layout.tsx), le centre de style (SiteStyleProvider / SiteStyleEditor)
 * et toutes les modales qui proposent un choix de police ou de style de titre.
 *
 * Chaque niveau (Titre 1 → Titre 5, Paragraphe) expose des variables CSS
 * --font-<niveau>-family | -size | -weight | -line | -tracking | -transform
 * consommées par les classes globales .style-h1 … .style-p (styles/globals.css).
 */

export type TypographyKey = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';

export type TypographyLevel = {
  family?: string;
  size?: string;
  weight?: string;
  /** Interligne sans unité (ex. 1.1). */
  lineHeight?: string;
  /** Espacement des lettres en em (ex. -0.03). */
  letterSpacing?: string;
  transform?: 'none' | 'uppercase';
};

export type TypographySettings = Partial<Record<TypographyKey, TypographyLevel>>;

export type FontMeta = {
  /** Nom d'origine du fichier (sert aussi de nom de police historique). */
  name: string;
  url: string;
  /** Famille à laquelle rattacher ce fichier (ex. « Barlow »). */
  family?: string;
  weight?: string;
  style?: string;
};

/** Suffixe des variables CSS pour chaque niveau. */
export const TYPO_VAR: Record<TypographyKey, string> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', p: 'body',
};

export const TYPO_LEVELS: { key: TypographyKey; label: string; role: string }[] = [
  { key: 'h1', label: 'Titre 1', role: 'Grand titre de page' },
  { key: 'h2', label: 'Titre 2', role: 'Titre de section' },
  { key: 'h3', label: 'Titre 3', role: 'Titre de carte, sous-section' },
  { key: 'h4', label: 'Titre 4', role: 'Petit titre, intertitre' },
  { key: 'h5', label: 'Titre 5', role: 'Sur-titre, étiquette' },
  { key: 'p', label: 'Paragraphe', role: 'Texte courant' },
];

/** Options communes à toutes les listes « Style du titre / du texte ». */
export const TITLE_STYLE_OPTIONS: { value: TypographyKey; label: string }[] = [
  { value: 'h1', label: 'Titre 1 — grand titre' },
  { value: 'h2', label: 'Titre 2 — titre de section' },
  { value: 'h3', label: 'Titre 3 — titre de carte' },
  { value: 'h4', label: 'Titre 4 — petit titre' },
  { value: 'h5', label: 'Titre 5 — sur-titre' },
  { value: 'p', label: 'Paragraphe' },
];

/** Échelle moderne proposée par défaut (préréglage « Studio »). */
export const RECOMMENDED_SCALE: Record<TypographyKey, Omit<TypographyLevel, 'family'>> = {
  h1: { size: '96px', weight: '500', lineHeight: '0.95', letterSpacing: '-0.045', transform: 'none' },
  h2: { size: '64px', weight: '500', lineHeight: '1', letterSpacing: '-0.035', transform: 'none' },
  h3: { size: '32px', weight: '500', lineHeight: '1.1', letterSpacing: '-0.025', transform: 'none' },
  h4: { size: '21px', weight: '600', lineHeight: '1.3', letterSpacing: '-0.01', transform: 'none' },
  h5: { size: '12px', weight: '500', lineHeight: '1.4', letterSpacing: '0.16', transform: 'uppercase' },
  p: { size: '17px', weight: '400', lineHeight: '1.65', letterSpacing: '0', transform: 'none' },
};

export const WEIGHT_OPTIONS = [
  { value: '100', label: '100 — Thin' },
  { value: '200', label: '200 — ExtraLight' },
  { value: '300', label: '300 — Light' },
  { value: '400', label: '400 — Regular' },
  { value: '500', label: '500 — Medium' },
  { value: '600', label: '600 — SemiBold' },
  { value: '700', label: '700 — Bold' },
  { value: '800', label: '800 — ExtraBold' },
  { value: '900', label: '900 — Black' },
];

/** Polices système proposées en plus des polices importées. */
export const SYSTEM_FONTS: { value: string; label: string }[] = [
  { value: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', label: 'Système (sans empattement)' },
  { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (serif)' },
  { value: 'ui-monospace, "SF Mono", Menlo, monospace', label: 'Monospace' },
];

const WEIGHT_WORDS: [RegExp, string][] = [
  [/extra[-_ ]?light|ultra[-_ ]?light/i, '200'],
  [/semi[-_ ]?bold|demi[-_ ]?bold/i, '600'],
  [/extra[-_ ]?bold|ultra[-_ ]?bold/i, '800'],
  [/hairline|thin/i, '100'],
  [/light/i, '300'],
  [/medium/i, '500'],
  [/black|heavy/i, '900'],
  [/bold/i, '700'],
  [/regular|normal|book|roman/i, '400'],
];

/**
 * Déduit famille, graisse et style d'un nom de fichier
 * (« Barlow-SemiBoldItalic.woff2 » → Barlow / 600 / italic).
 */
export function detectFontMeta(fileName: string): { family: string; weight: string; style: string } {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/^\d{10,}-/, '');
  const style = /italic|oblique/i.test(base) ? 'italic' : 'normal';
  const weight = WEIGHT_WORDS.find(([re]) => re.test(base))?.[1] ?? '400';
  const family = base
    .replace(/[-_ ]?(extra|ultra|semi|demi)?[-_ ]?(hairline|thin|light|regular|normal|book|roman|medium|bold|black|heavy)?[-_ ]?(italic|oblique)?$/i, '')
    .replace(/[-_]?(VariableFont.*|Variable|VF)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return { family: family || base, weight, style };
}

function fontFormat(url: string): string {
  const ext = (url.split('?')[0].match(/\.(woff2?|ttf|otf)$/i)?.[1] || 'woff2').toLowerCase();
  return ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext;
}

const clean = (s: string) => String(s || '').replace(/["'\\]/g, '').trim();

/**
 * Règles @font-face des polices importées.
 *  · Sous sa famille (si renseignée) : déclarée avec sa vraie graisse, ce qui
 *    permet au navigateur de choisir le bon fichier pour chaque graisse.
 *  · Sous son nom historique : déclarée sur toute la plage 100–900, pour que
 *    les réglages existants affichent le fichier tel quel, sans faux gras
 *    synthétisé par le navigateur.
 */
export function fontFaceCss(fonts: FontMeta[] | undefined): string {
  if (!Array.isArray(fonts)) return '';
  return fonts
    .filter((f) => f && f.name && f.url)
    .map((f) => {
      const src = `src: url('${String(f.url).replace(/'/g, '%27')}') format('${fontFormat(f.url)}')`;
      const style = f.style === 'italic' ? 'italic' : 'normal';
      const legacy = `@font-face{font-family:"${clean(f.name)}";${src};font-weight:100 900;font-style:${style};font-display:swap;}`;
      if (!f.family || clean(f.family) === clean(f.name)) return legacy;
      return `${legacy}@font-face{font-family:"${clean(f.family)}";${src};font-weight:${f.weight || '400'};font-style:${style};font-display:swap;}`;
    })
    .join('\n');
}

export function quoteFamily(f: string): string {
  if (!f) return f;
  if (/^["'].*["']$/.test(f) || f.includes(',')) return f;
  return /\s/.test(f) ? `'${f}'` : f;
}

/** Pile de polices complète : la police choisie puis un repli système. */
export function familyStack(f: string | undefined): string | undefined {
  if (!f) return undefined;
  const q = quoteFamily(f);
  return q.includes(',') ? q : `${q}, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
}

function normSize(v?: string): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim();
  return /^\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
}

/** Variables CSS d'un style de site (sans sélecteur). */
export function typographyCssVars(t: TypographySettings | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!t) return vars;
  (Object.keys(TYPO_VAR) as TypographyKey[]).forEach((key) => {
    const conf = t[key];
    if (!conf) return;
    const v = TYPO_VAR[key];
    const family = familyStack(conf.family);
    if (family) vars[`--font-${v}-family`] = family;
    const size = normSize(conf.size);
    if (size) vars[`--font-${v}-size`] = size;
    if (conf.weight) vars[`--font-${v}-weight`] = String(conf.weight);
    if (conf.lineHeight) vars[`--font-${v}-line`] = String(conf.lineHeight);
    if (conf.letterSpacing !== undefined && conf.letterSpacing !== '') {
      const ls = String(conf.letterSpacing).trim();
      vars[`--font-${v}-tracking`] = /^-?\d*\.?\d+$/.test(ls) ? `${ls}em` : ls;
    }
    if (conf.transform) vars[`--font-${v}-transform`] = conf.transform;
  });
  return vars;
}

/** Familles proposées dans toutes les listes « Police ». */
export function fontFamilyOptions(fonts: FontMeta[] | undefined): { value: string; label: string }[] {
  const seen = new Set<string>();
  const imported: { value: string; label: string }[] = [];
  (fonts || []).forEach((f) => {
    const name = clean(f.family || f.name);
    if (!name || seen.has(name)) return;
    seen.add(name);
    imported.push({ value: name, label: name });
  });
  return [...imported, ...SYSTEM_FONTS];
}

/** Options « police du style de site » : réutilisent la police d'un niveau. */
export const STYLE_FONT_OPTIONS: { value: string; label: string }[] = TYPO_LEVELS.map((l) => ({
  value: `var(--font-${TYPO_VAR[l.key]}-family)`,
  label: `Police du ${l.label}`,
}));
