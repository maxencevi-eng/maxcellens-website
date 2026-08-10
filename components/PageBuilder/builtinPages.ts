/**
 * Pages historiques du site (accueil, contact, portrait…).
 *
 * Elles restent rendues par leurs composants dédiés, mais reçoivent une
 * « page hôte » en base qui porte les blocs ajoutés depuis l'administration.
 * C'est ce qui permet d'enrichir une page existante sans la réécrire.
 *
 * Le slug de la page hôte est préfixé pour ne jamais entrer en collision avec
 * une page créée par l'utilisateur, et il est exclu des listes, du menu et du
 * sitemap (voir `lib/pages.ts`).
 */

export const BUILTIN_PREFIX = '__builtin/';

export type BuiltinPageKey =
  | 'home'
  | 'contact'
  | 'animation'
  | 'realisation'
  | 'evenement'
  | 'corporate'
  | 'portrait'
  | 'galeries';

export const BUILTIN_PAGES: { key: BuiltinPageKey; label: string; path: string }[] = [
  { key: 'home', label: 'Accueil', path: '/' },
  { key: 'realisation', label: 'Réalisation', path: '/realisation' },
  { key: 'evenement', label: 'Évènement', path: '/evenement' },
  { key: 'corporate', label: 'Corporate', path: '/corporate' },
  { key: 'portrait', label: 'Portrait', path: '/portrait' },
  { key: 'animation', label: 'Animation', path: '/animation' },
  { key: 'galeries', label: 'Galeries', path: '/galeries' },
  { key: 'contact', label: 'Contact', path: '/contact' },
];

export function builtinSlug(key: BuiltinPageKey): string {
  return `${BUILTIN_PREFIX}${key}`;
}

export function isBuiltinSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.startsWith(BUILTIN_PREFIX);
}

export function builtinLabel(key: BuiltinPageKey): string {
  return BUILTIN_PAGES.find((p) => p.key === key)?.label || key;
}

export function isBuiltinKey(value: string): value is BuiltinPageKey {
  return BUILTIN_PAGES.some((p) => p.key === value);
}
