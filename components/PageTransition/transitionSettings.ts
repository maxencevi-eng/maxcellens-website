/**
 * Réglages des transitions de page.
 *
 * Séparés du provider pour être lisibles côté serveur et par l'éditeur sans
 * importer React.
 */

export type TransitionStyle = 'curtain' | 'fade' | 'slide' | 'mask';

export type TransitionSettings = {
  enabled: boolean;
  /** Style visuel de la transition. */
  style: TransitionStyle;
  overlayColor: string;
  /** Durée totale de référence, en secondes (0.3 – 1.2). */
  duration: number;
  /** Délai max. d'attente de la page destination, en secondes. */
  maxWait: number;
  /**
   * Durée minimale de recouvrement, en secondes.
   * Sans elle, une page déjà en cache produit un clignotement : l'overlay
   * couvre et se retire dans la même frame.
   */
  minCover: number;
  /** Affiche un indicateur si l'attente dépasse ~400 ms. */
  showProgress: boolean;
  /** Précharge la route au survol / au toucher du lien. */
  prefetch: boolean;

  /**
   * @deprecated Remplacé par `style`. Conservé pour relire les enregistrements
   * antérieurs : `standard` et `seamless` décrivaient le moment du
   * `router.push`, désormais toujours immédiat.
   */
  mode?: 'standard' | 'seamless';
};

export const DEFAULT_TRANSITION_SETTINGS: TransitionSettings = {
  enabled: true,
  style: 'curtain',
  overlayColor: '#172622',
  duration: 0.6,
  maxWait: 2,
  minCover: 0.18,
  showProgress: true,
  prefetch: true,
};

/** Complète et migre une valeur brute lue en base. */
export function normalizeTransitionSettings(raw: any): TransitionSettings {
  const merged = { ...DEFAULT_TRANSITION_SETTINGS, ...(raw || {}) };
  // Migration : les anciens enregistrements ne portent que `mode`.
  if (!raw?.style) merged.style = 'curtain';
  merged.duration = clamp(Number(merged.duration) || 0.6, 0.2, 1.6);
  merged.maxWait = clamp(Number(merged.maxWait) || 2, 0.5, 5);
  merged.minCover = clamp(Number(merged.minCover ?? 0.18), 0, 0.8);
  return merged;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Courbes d'accélération.
 *
 * L'ancienne version appliquait la même courbe *ease-out* aux deux phases :
 * le rideau ralentissait en fin de recouvrement, ce qui donnait la sensation
 * de mollesse. Un rideau qui couvre doit accélérer, un rideau qui révèle doit
 * décélérer.
 */
export const EASE_COVER: [number, number, number, number] = [0.4, 0, 1, 1];
export const EASE_REVEAL: [number, number, number, number] = [0, 0, 0.2, 1];

/** Répartition de la durée totale entre recouvrement et révélation. */
export function phaseDurations(duration: number) {
  return {
    /** Le recouvrement est bref : c'est un départ, pas un spectacle. */
    cover: duration * 0.42,
    /** La révélation respire un peu plus — c'est elle qu'on regarde. */
    reveal: duration * 0.52,
  };
}
