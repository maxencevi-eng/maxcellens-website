/**
 * Données et valeurs par défaut des blocs.
 *
 * Séparé de `registry.tsx` pour rester importable côté serveur (la route
 * attrape-tout normalise les données avant rendu).
 */

export type BlockAlign = 'left' | 'center' | 'right';
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';

/** Une couleur de bloc réfère au centre de style, ou surcharge explicitement. */
export type ThemeColor =
  | { source: 'theme'; token: 'text' | 'primary' | 'secondary' | 'accent' | 'muted' | 'border' }
  | { source: 'custom'; value: string };

export const THEME_COLOR_VAR: Record<
  Extract<ThemeColor, { source: 'theme' }>['token'],
  string
> = {
  text: 'var(--color-text, var(--fg, #213431))',
  primary: 'var(--color-primary, #213431)',
  secondary: 'var(--color-secondary, #111111)',
  accent: 'var(--color-accent, #ff4081)',
  muted: 'var(--muted, #6b7280)',
  border: 'rgba(33, 52, 49, 0.18)',
};

/** Résout une couleur de bloc en valeur CSS. */
export function resolveColor(c: ThemeColor | undefined, fallback = 'currentColor'): string {
  if (!c) return fallback;
  if (c.source === 'custom') return c.value || fallback;
  return THEME_COLOR_VAR[c.token] || fallback;
}

export const DEFAULT_THEME_COLOR: ThemeColor = { source: 'theme', token: 'border' };

/* ── Séparateur ───────────────────────────────────────────────────────── */
export type SeparatorStyle = 'solid' | 'dashed' | 'dotted' | 'gradient' | 'ornament';

export type SeparatorData = {
  style: SeparatorStyle;
  thickness: number;
  color: ThemeColor;
  /** Largeur en % de la zone de contenu. */
  widthPercent: number;
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_SEPARATOR: SeparatorData = {
  style: 'solid',
  thickness: 1,
  color: DEFAULT_THEME_COLOR,
  widthPercent: 100,
  marginTop: 32,
  marginBottom: 32,
};

/* ── Espace ───────────────────────────────────────────────────────────── */
export type SpacerData = {
  heightDesktop: number;
  heightMobile: number;
};

export const DEFAULT_SPACER: SpacerData = {
  heightDesktop: 48,
  heightMobile: 32,
};

/* ── Bouton ───────────────────────────────────────────────────────────── */
export type ButtonData = {
  label: string;
  /** Lien interne (slug) ou URL externe. */
  href: string;
  /** '1' et '2' correspondent aux styles définis dans Style du site > Boutons. */
  variant: '1' | '2';
  size: 'sm' | 'md' | 'lg';
  align: BlockAlign;
  /** Ouvre dans un nouvel onglet. */
  newTab: boolean;
  /** Occupe toute la largeur sur mobile — cible tactile confortable. */
  fullWidthMobile: boolean;
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_BUTTON: ButtonData = {
  label: 'En savoir plus',
  href: '/contact',
  variant: '1',
  size: 'md',
  align: 'center',
  newTab: false,
  fullWidthMobile: true,
  marginTop: 24,
  marginBottom: 24,
};

/* ── Titre ────────────────────────────────────────────────────────────── */
export type HeadingData = {
  eyebrow: string;
  text: string;
  level: HeadingLevel;
  align: BlockAlign;
  /** 0 = taille héritée du centre de style. */
  fontSize: number;
  color: ThemeColor;
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_HEADING: HeadingData = {
  eyebrow: '',
  text: 'Nouveau titre',
  level: 'h2',
  align: 'left',
  fontSize: 0,
  color: { source: 'theme', token: 'text' },
  marginTop: 24,
  marginBottom: 16,
};

/* ── Texte riche ──────────────────────────────────────────────────────── */
export type RichTextData = {
  html: string;
  align: BlockAlign;
  /** 0 = largeur héritée de la zone de contenu. */
  maxWidth: number;
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_RICH_TEXT: RichTextData = {
  html: '<p>Saisissez votre texte ici.</p>',
  align: 'left',
  maxWidth: 0,
  marginTop: 16,
  marginBottom: 16,
};

/* ── Image ────────────────────────────────────────────────────────────── */
export type ImageBlockData = {
  image: { url: string; path?: string } | null;
  alt: string;
  caption: string;
  /** Rapport d'affichage. 'auto' conserve les proportions du fichier. */
  ratio: 'auto' | '21:9' | '16:9' | '4:3' | '3:2' | '1:1' | '4:5';
  radius: number;
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_IMAGE: ImageBlockData = {
  image: null,
  alt: '',
  caption: '',
  ratio: 'auto',
  radius: 12,
  marginTop: 16,
  marginBottom: 16,
};

export const RATIO_VALUES: Record<string, string> = {
  '21:9': '21 / 9',
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '1:1': '1 / 1',
  '4:5': '4 / 5',
};

/* ── Colonnes ─────────────────────────────────────────────────────────── */
export type ColumnsLayout = '2' | '3' | '4' | 'wide-left' | 'wide-right';

/** Contenu d'une colonne : une liste de blocs simples imbriqués. */
export type NestedBlock = { type: string; data: Record<string, unknown> };

export type ColumnsData = {
  layout: ColumnsLayout;
  gap: number;
  verticalAlign: 'start' | 'center' | 'end';
  columns: NestedBlock[][];
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_COLUMNS: ColumnsData = {
  layout: '2',
  gap: 24,
  verticalAlign: 'start',
  columns: [[], []],
  marginTop: 24,
  marginBottom: 24,
};

/** Nombre de colonnes d'une disposition. */
export function columnCount(layout: ColumnsLayout): number {
  if (layout === '3') return 3;
  if (layout === '4') return 4;
  return 2;
}

/* ── Intégration externe ──────────────────────────────────────────────── */
export type EmbedData = {
  html: string;
  /** Rapport hauteur/largeur en %, 0 = hauteur naturelle. */
  ratioPercent: number;
  marginTop: number;
  marginBottom: number;
};

export const DEFAULT_EMBED: EmbedData = {
  html: '',
  ratioPercent: 56.25,
  marginTop: 16,
  marginBottom: 16,
};

/** Blocs autorisés à l'intérieur d'une colonne (pas de colonnes imbriquées). */
export const NESTABLE_TYPES = ['heading', 'richtext', 'image', 'button', 'spacer', 'separator'];
