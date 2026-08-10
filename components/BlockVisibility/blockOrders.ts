/**
 * SOURCE UNIQUE de l'ordre par défaut des blocs, par page.
 *
 * Ces listes étaient auparavant dupliquées entre
 * `app/api/block-visibility/route.ts` et `BlockVisibilityContext.tsx`, et les
 * deux copies avaient divergé (`contact_kit` d'un côté, `contact_gallery` de
 * l'autre) : selon la source lue, un bloc contact pouvait disparaître ou
 * apparaître en double. Les deux fichiers importent désormais d'ici.
 *
 * Ce module doit rester utilisable côté serveur : aucune dépendance React.
 */

export type BlockOrderPage =
  | 'home'
  | 'contact'
  | 'animation'
  | 'realisation'
  | 'evenement'
  | 'corporate'
  | 'portrait'
  | 'galeries';

export type BlockWidthMode = 'full' | 'max1600';

export const BLOCK_ORDER_PAGES: BlockOrderPage[] = [
  'home',
  'contact',
  'animation',
  'realisation',
  'evenement',
  'corporate',
  'portrait',
  'galeries',
];

export const DEFAULT_BLOCK_ORDERS: Record<BlockOrderPage, string[]> = {
  home: [
    'home_intro',
    'home_banner',
    'home_services',
    'home_animation',
    'home_portrait',
    'home_cadreur',
    'home_stats',
    'clients',
    'home_quote',
    'home_cta',
  ],
  // `contact_gallery` est le nom retenu : c'est celui que rend ContactBlocks.
  contact: ['contact_intro', 'contact_zones', 'contact_gallery', 'contact_faq'],
  animation: ['animation_s1', 'animation_s2', 'animation_s3', 'animation_cta'],
  realisation: ['production_intro', 'production_videos'],
  evenement: ['evenement_intro', 'evenement_videos'],
  corporate: ['corporate_intro', 'corporate_videos'],
  portrait: ['portrait_intro', 'portrait_gallery'],
  galeries: ['galeries_menu'],
};

/** Clé `site_settings` portant l'ordre sauvegardé d'une page. */
export function orderSettingKey(page: BlockOrderPage): string {
  return `block_order_${page}`;
}

/** Nom de la propriété exposée par le contexte (compatibilité ascendante). */
export function orderContextKey(page: BlockOrderPage): string {
  return `blockOrder${page.charAt(0).toUpperCase()}${page.slice(1)}`;
}

/**
 * Fusionne un ordre sauvegardé avec les défauts.
 *
 * Un bloc ajouté au code après la dernière sauvegarde de l'utilisateur doit
 * réapparaître, et à sa position d'origine plutôt qu'à la fin. On l'insère
 * donc juste après son prédécesseur dans la liste par défaut.
 *
 * Les identifiants sauvegardés inconnus des défauts sont conservés : ils
 * peuvent provenir de blocs dynamiques créés depuis l'admin.
 */
export function mergeBlockOrder(saved: unknown, defaults: string[]): string[] {
  if (!Array.isArray(saved)) return [...defaults];
  const ids = saved.filter((id): id is string => typeof id === 'string');
  if (!ids.length) return [...defaults];

  // Dédoublonne : une sauvegarde corrompue ne doit pas rendre un bloc deux fois
  const result = Array.from(new Set(ids));

  for (const id of defaults) {
    if (result.includes(id)) continue;
    const defaultIdx = defaults.indexOf(id);
    const predecessor = defaultIdx > 0 ? defaults[defaultIdx - 1] : null;
    const insertAfter = predecessor ? result.indexOf(predecessor) : -1;
    if (insertAfter >= 0) result.splice(insertAfter + 1, 0, id);
    else if (defaultIdx === 0) result.unshift(id);
    else result.push(id);
  }
  return result;
}

/** Parse la valeur JSON brute d'un ordre stocké en base. */
export function parseBlockOrder(raw: unknown, defaults: string[]): string[] {
  if (!raw || typeof raw !== 'string') return [...defaults];
  try {
    return mergeBlockOrder(JSON.parse(raw), defaults);
  } catch {
    return [...defaults];
  }
}
