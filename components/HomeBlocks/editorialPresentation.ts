/**
 * Présentation « Studio » de la page d'accueil (designVersion 2).
 *
 * Les blocs enregistrés avant ce design portent des couleurs, marges, tailles,
 * alignements et styles de titre choisis pour les présentations précédentes :
 * appliqués tels quels, ils cassaient l'harmonie de la palette. Tant qu'un
 * bloc n'a pas été réenregistré depuis l'admin avec ce design, on retire ces
 * réglages de présentation (le contenu — textes, images, liens — est
 * conservé). Dès qu'il est réenregistré, designVersion vaut 2 et les réglages
 * choisis dans l'admin s'appliquent à nouveau.
 */
export const HOME_DESIGN_VERSION = 2;

const PRESENTATION_KEYS = [
  'backgroundColor', 'contentBgColor', 'textColor',
  'titleColor', 'blockTitleColor', 'blockSubtitleColor', 'eyebrowColor',
  'cardBackground', 'cardBorderColor', 'cardTextColor',
  'paddingTop', 'paddingBottom', 'borderRadiusTop', 'borderRadiusBottom',
  'titleFontSize', 'blockTitleFontSize', 'blockSubtitleFontSize', 'eyebrowFontSize',
  'titleAlign', 'blockTitleAlign', 'blockSubtitleAlign', 'eyebrowAlign', 'videosSectionTitleAlign',
  'titleStyle', 'blockTitleStyle', 'blockSubtitleStyle', 'ctaButtonStyle', 'buttonStyle', 'imageTilted',
];

const NESTED_PRESENTATION_KEYS = ['titleStyle', 'titleFontSize', 'descriptionStyle', 'descriptionFontSize', 'authorStyle', 'roleStyle'];

function stripNested<T>(list: T[] | undefined): T[] | undefined {
  if (!Array.isArray(list)) return list;
  return list.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const copy: Record<string, unknown> = { ...(item as Record<string, unknown>) };
    NESTED_PRESENTATION_KEYS.forEach((k) => delete copy[k]);
    return copy as T;
  });
}

export function editorialPresentation<T extends object>(_key: string, data: T): T {
  const d = data as Record<string, unknown>;
  if (d?.designVersion === HOME_DESIGN_VERSION) return data;
  const copy: Record<string, unknown> = { ...d };
  PRESENTATION_KEYS.forEach((k) => delete copy[k]);
  delete copy.presentationVersion;
  copy.items = stripNested(copy.items as unknown[]);
  copy.slides = stripNested(copy.slides as unknown[]);
  copy.quotes = stripNested(copy.quotes as unknown[]);
  if (copy.items === undefined) delete copy.items;
  if (copy.slides === undefined) delete copy.slides;
  if (copy.quotes === undefined) delete copy.quotes;
  copy.designVersion = HOME_DESIGN_VERSION;
  return copy as T;
}

/** Même principe pour le bloc Clients (réglages stockés à plat). */
export function editorialClients(data: Record<string, string>) {
  if (data.clients_presentation_version === '2') return data;
  return {
    ...data,
    clients_presentation_version: '2',
    clients_bg: '', clients_title_style: 'h5', clients_title_font_size: '', clients_title_color: '',
    clients_title_align: 'left', clients_padding_top: '', clients_padding_bottom: '',
    clients_radius_top: '', clients_radius_bottom: '',
    clients_logo_filter: data.clients_logo_filter || 'grayscale',
  };
}
