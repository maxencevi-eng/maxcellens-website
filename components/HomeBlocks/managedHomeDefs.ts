import { DEFAULT_INTRO, DEFAULT_SERVICES, DEFAULT_BANNER, DEFAULT_STATS, DEFAULT_PORTRAIT, DEFAULT_CADREUR, DEFAULT_ANIMATION, DEFAULT_QUOTE, DEFAULT_CTA } from './homeDefaults';
import { editorialPresentation } from './editorialPresentation';

export const MANAGED_HOME_BLOCKS = [
  ['home_intro', 'Introduction', DEFAULT_INTRO],
  ['home_banner', 'Bannière', DEFAULT_BANNER],
  ['home_services', 'Services', DEFAULT_SERVICES],
  ['home_portrait', 'Portrait', DEFAULT_PORTRAIT],
  ['home_cadreur', 'Cadreur', DEFAULT_CADREUR],
  ['home_stats', 'Chiffres clés', DEFAULT_STATS],
  ['home_animation', 'Bureau à la carte', DEFAULT_ANIMATION],
  ['home_clients', 'Clients et partenaires', { clients_title: 'Clients et partenaires', clients_logos: '[]', clients_grid: '{"columns":6,"itemWidth":120,"heightRatio":0.5}', clients_presentation_version: '1', clients_bg: '#f3f1ed' }],
  ['home_quote', 'Témoignages', DEFAULT_QUOTE],
  ['home_cta', 'Appel à l’action', DEFAULT_CTA],
] as const;

export function homeBlockDefaults(type: string) {
  const entry = MANAGED_HOME_BLOCKS.find(([key]) => key === type);
  return entry ? JSON.parse(JSON.stringify(editorialPresentation(type, entry[2]))) : {};
}
export const legacyOrderId = (type: string) => type === 'home_clients' ? 'clients' : type;
export const isManagedHomeType = (type: string) => MANAGED_HOME_BLOCKS.some(([key]) => key === type);
