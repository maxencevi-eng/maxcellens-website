import type { BlockAlign, HeadingLevel, ThemeColor } from './blockDefs';

export type ImageCard = {
  image: { url: string; path?: string } | null;
  alt: string;
  title: string;
  subtitle: string;
  href: string;
  newTab: boolean;
  focusX: number;
  focusY: number;
};
export type ImageCardsData = {
  eyebrow: string;
  title: string;
  subtitle: string;
  headingLevel: HeadingLevel;
  titleSize: number;
  titleAlign: BlockAlign;
  titlePosition: 'left' | 'right';
  color: ThemeColor;
  background: ThemeColor;
  cardColor: ThemeColor;
  columns: number;
  gap: number;
  ratio: string;
  cardRadius: number;
  overlayOpacity: number;
  cardTitleSize: number;
  ctaLabel: string;
  ctaHref: string;
  ctaNewTab: boolean;
  paddingTop: number;
  paddingBottom: number;
  paddingX: number;
  marginTop: number;
  marginBottom: number;
  radiusTop: number;
  radiusBottom: number;
  cards: ImageCard[];
};
export const EMPTY_IMAGE_CARD: ImageCard = {
  image: null, alt: '', title: '', subtitle: '', href: '', newTab: false, focusX: 50, focusY: 50,
};
export const DEFAULT_PROJECT_CARDS: ImageCardsData = {
  eyebrow: 'Sélection de réalisations', title: 'Des projets concrets. Des histoires vraies.', subtitle: '',
  headingLevel: 'h2', titleSize: 32, titleAlign: 'left', titlePosition: 'left',
  color: { source: 'custom', value: '#202a2b' }, background: { source: 'custom', value: '#f3f1ed' },
  cardColor: { source: 'custom', value: '#ffffff' }, columns: 4, gap: 12, ratio: '4:3',
  cardRadius: 0, overlayOpacity: 80, cardTitleSize: 15,
  ctaLabel: '', ctaHref: '', ctaNewTab: false,
  paddingTop: 32, paddingBottom: 32, paddingX: 48, marginTop: 0, marginBottom: 0,
  radiusTop: 0, radiusBottom: 0,
  cards: Array.from({ length: 4 }, (_, i) => ({ ...EMPTY_IMAGE_CARD, title: `Projet ${i + 1}` })),
};
export const DEFAULT_SERVICE_CARDS: ImageCardsData = {
  ...DEFAULT_PROJECT_CARDS, eyebrow: 'Mes prestations', title: 'Des images pour chaque ambition.',
  color: { source: 'custom', value: '#f5f3ef' }, background: { source: 'custom', value: '#192425' },
  columns: 6, ratio: '4:5', cardTitleSize: 13,
  cards: Array.from({ length: 6 }, (_, i) => ({ ...EMPTY_IMAGE_CARD, title: `Prestation ${i + 1}` })),
};

/** Keep empty lists intentional and give each new instance independent cards. */
export function normalizeImageCards(raw: Partial<ImageCardsData> | null, defaults: ImageCardsData): ImageCardsData {
  const data = { ...defaults, ...(raw || {}) };
  return {
    ...data,
    columns: Math.max(1, Math.min(8, Number(data.columns) || defaults.columns)),
    cards: (Array.isArray(data.cards) ? data.cards : defaults.cards).filter(Boolean).map(card => ({ ...EMPTY_IMAGE_CARD, ...card })),
  };
}

export function safeCardHref(href: string): string | undefined {
  const value = (href || '').trim();
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value) ? value : undefined;
}
