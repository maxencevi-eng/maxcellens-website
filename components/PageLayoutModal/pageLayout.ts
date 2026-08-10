/**
 * Réglages de dimensions et de mise en page du site.
 *
 * SOURCE UNIQUE : les défauts et l'application des variables CSS étaient
 * dupliqués entre `PageLayoutProvider`, `PageLayoutModal` et
 * `app/api/page-layout/route.ts`, avec des valeurs déjà désynchronisées.
 *
 * Utilisable côté serveur : aucune dépendance React.
 */

export type LayoutSection = {
  /** Largeur max. du corps de la page (px). */
  containerMaxWidth: number;
  /** Largeur max. de la zone contenu (texte / blocs) à l'intérieur du corps. */
  contentInnerMaxWidth: number;
  /** Hauteur min. de la zone contenu (px) — 0 = pas de minimum. */
  contentInnerMinHeight: number;
  /** Marge intérieure des blocs (px). */
  blockInnerPadding: number;
  /** Marge horizontale du corps de page (px). */
  marginHorizontal: number;
  /** Marge verticale de la zone contenu (px). */
  marginVertical: number;
  /** Espace entre deux sections d'une page (px). */
  sectionGap: number;
};

export type PageLayout = {
  desktop: LayoutSection;
  mobile: LayoutSection;
  /**
   * Version du schéma.
   *
   * Absente = enregistrement antérieur au câblage de `sectionGap`. Ce champ
   * était alors stocké mais jamais appliqué : sa valeur (48 px par défaut) ne
   * correspond à aucune intention de l'utilisateur. L'appliquer telle quelle
   * écarterait brutalement toutes les sections, et comme les blocs de contenu
   * débordent en pleine largeur (`100vw`) alors que leur conteneur ne le fait
   * pas, l'écart laisse apparaître le fond de page en bandes sur les côtés.
   * On la ramène donc à 0 à la première lecture.
   */
  version?: number;
};

export const LAYOUT_SCHEMA_VERSION = 2;

export const DEFAULT_DESKTOP: LayoutSection = {
  containerMaxWidth: 1200,
  contentInnerMaxWidth: 2000,
  contentInnerMinHeight: 0,
  blockInnerPadding: 24,
  marginHorizontal: 24,
  marginVertical: 0,
  // 0 par défaut : le réglage n'ayant jamais été appliqué, une valeur non
  // nulle changerait brutalement l'espacement de toutes les pages.
  sectionGap: 0,
};

export const DEFAULT_MOBILE: LayoutSection = {
  containerMaxWidth: 1000,
  contentInnerMaxWidth: 1200,
  contentInnerMinHeight: 0,
  blockInnerPadding: 16,
  marginHorizontal: 16,
  marginVertical: 0,
  sectionGap: 0,
};

export const DEFAULT_LAYOUT: PageLayout = {
  desktop: DEFAULT_DESKTOP,
  mobile: DEFAULT_MOBILE,
  version: LAYOUT_SCHEMA_VERSION,
};

/**
 * Complète un objet partiel (valeur en base, réponse API) avec les défauts,
 * et migre les enregistrements antérieurs au câblage de `sectionGap`.
 */
export function normalizeLayout(raw: any): PageLayout {
  const desktop = { ...DEFAULT_DESKTOP, ...(raw?.desktop || {}) };
  const mobile = { ...DEFAULT_MOBILE, ...(raw?.mobile || {}) };

  // Migration v1 → v2 : l'ancien `sectionGap` n'a jamais eu d'effet visible,
  // on repart de 0 plutôt que d'appliquer une valeur jamais choisie.
  const version = Number(raw?.version) || 1;
  if (version < LAYOUT_SCHEMA_VERSION) {
    desktop.sectionGap = 0;
    mobile.sectionGap = 0;
  }

  return { desktop, mobile, version: LAYOUT_SCHEMA_VERSION };
}

/** Écrit les variables CSS de mise en page sur `:root`. */
export function applyLayoutVars(layout: PageLayout): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { desktop, mobile } = normalizeLayout(layout);

  const set = (name: string, value: string) => root.style.setProperty(name, value);

  set('--container-max-width-desktop', `${desktop.containerMaxWidth}px`);
  set('--content-inner-max-width-desktop', `${desktop.contentInnerMaxWidth}px`);
  set('--content-inner-min-height-desktop', `${desktop.contentInnerMinHeight}px`);
  set('--block-inner-padding-desktop', `${desktop.blockInnerPadding}px`);
  set('--container-margin-x-desktop', `${desktop.marginHorizontal}px`);
  set('--container-margin-y-desktop', `${desktop.marginVertical}px`);
  set('--section-gap-desktop', `${desktop.sectionGap}px`);

  set('--container-max-width-mobile', `${mobile.containerMaxWidth}px`);
  set('--content-inner-max-width-mobile', `${mobile.contentInnerMaxWidth}px`);
  set('--content-inner-min-height-mobile', `${mobile.contentInnerMinHeight}px`);
  set('--block-inner-padding-mobile', `${mobile.blockInnerPadding}px`);
  set('--container-margin-x-mobile', `${mobile.marginHorizontal}px`);
  set('--container-margin-y-mobile', `${mobile.marginVertical}px`);
  set('--section-gap-mobile', `${mobile.sectionGap}px`);
}

/** Événement diffusé après enregistrement, écouté par PageLayoutProvider. */
export const PAGE_LAYOUT_UPDATED = 'page-layout-updated';
