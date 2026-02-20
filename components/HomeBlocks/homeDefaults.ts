/**
 * Données par défaut des blocs de la page d'accueil (éditables via modale).
 */

/** Taille de titre en px (8–72). */
export const TITLE_FONT_SIZE_MIN = 8;
export const TITLE_FONT_SIZE_MAX = 72;

export type HomeIntroData = {
  title?: string;
  subtitle?: string;
  titleStyle?: TitleStyleKey;
  subtitleStyle?: TitleStyleKey;
  /** Taille du titre en px (8–72). */
  titleFontSize?: number;
  subtitleFontSize?: number;
  html?: string;
  /** Couleur de fond du bloc (remplace le style global des blocs) */
  backgroundColor?: string;
};

export type HomeServiceItem = {
  title: string;
  description: string;
  href: string;
  image?: { url: string; path?: string } | null;
  titleStyle?: TitleStyleKey;
  descriptionStyle?: TitleStyleKey;
  titleFontSize?: number;
};
export type TitleStyleKey = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export type HomeServicesData = {
  blockTitle?: string;
  blockSubtitle?: string;
  blockTitleStyle?: TitleStyleKey;
  blockSubtitleStyle?: TitleStyleKey;
  blockTitleFontSize?: number;
  blockSubtitleFontSize?: number;
  items: HomeServiceItem[];
  backgroundColor?: string;
};

export type HomeStatItem = { value: string; label: string };
export type HomeStatsData = { items: HomeStatItem[]; backgroundColor?: string };

export type FocusPoint = { x: number; y: number };

export type AnimationImageRatio = '4:1' | '21:9' | '16:9' | '4:3' | '3:2' | '4:5' | '1:1';

export type HomePortraitSlide = {
  title: string;
  text: string;
  image?: { url: string; path?: string; focus?: FocusPoint } | null;
  /** Seconde photo par section (petite, superposée en haut à droite de l'image principale) */
  image2?: { url: string; path?: string; focus?: FocusPoint } | null;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  /** URL du bouton "Découvrir les photos" pour ce thème */
  href?: string;
};

export type HomePortraitBlockData = {
  blockTitle?: string;
  blockTitleStyle?: TitleStyleKey;
  blockTitleFontSize?: number;
  ctaLabel?: string;
  ctaHref?: string;
  ctaButtonStyle?: '1' | '2';
  carouselSpeed?: number;
  slides: HomePortraitSlide[];
  backgroundColor?: string;
};

export type CadreurVideoItem = {
  url: string;
  title?: string;
  description?: string;
  visible?: boolean;
};

export type CadreurVideoSettings = {
  borderRadius?: number;
  shadow?: 'none' | 'light' | 'medium' | 'heavy';
  glossy?: boolean;
};

export type HomeCadreurBlockData = {
  title?: string;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  html?: string;
  image?: { url: string; path?: string; focus?: FocusPoint } | null;
  /** Ratio d'image pour le bloc Cadreur. `AnimationImageRatio` utilisé pour compatibilité */
  imageRatio?: AnimationImageRatio;
  backgroundColor?: string;
  /** Up to 3 featured project videos */
  videos?: CadreurVideoItem[];
  videoSettings?: CadreurVideoSettings;
  /** Title displayed above the video section */
  videosSectionTitle?: string;
  videosSectionTitleAlign?: 'left' | 'center' | 'right';
};

export type HomeQuoteItem = { text: string; author: string; role?: string; authorStyle?: TitleStyleKey; roleStyle?: TitleStyleKey };
export type HomeQuoteData = { quotes: HomeQuoteItem[]; carouselSpeed?: number; backgroundColor?: string };

export type HomeCtaData = { title: string; titleStyle?: TitleStyleKey; titleFontSize?: number; buttonLabel: string; buttonHref: string; buttonStyle?: '1' | '2'; backgroundColor?: string };

export type HomeAnimationBlockData = {
  blockTitle?: string;
  blockSubtitle?: string;
  blockTitleStyle?: TitleStyleKey;
  blockSubtitleStyle?: TitleStyleKey;
  blockTitleFontSize?: number;
  blockSubtitleFontSize?: number;
  /** Bannière / image d'accroche (optionnel) */
  image?: { url: string; path?: string } | null;
  /** Ratio d'image pour le bloc Animation */
  imageRatio?: AnimationImageRatio;
  /** Texte riche affiché sous le sous-titre */
  html?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaButtonStyle?: '1' | '2';
  backgroundColor?: string;
};

export const DEFAULT_INTRO: HomeIntroData = {
  title: "Maxcellens",
  subtitle: "Photographe professionnel — Portrait, Événement, Corporate",
  html: "<p>Portrait, événementiel, corporate et réalisation. Basé en Île-de-France, j'interviens partout en France et à l'étranger pour donner vie à vos projets en image.</p>",
};

export const DEFAULT_SERVICES: HomeServicesData = {
  blockTitle: "Services",
  blockSubtitle: "Réalisation, événementiel et corporate — des prestations sur mesure.",
  blockTitleStyle: "h2",
  blockSubtitleStyle: "p",
  items: [
    { title: "Réalisation", description: "Reportages photo et vidéo sur mesure.", href: "/realisation", image: null, titleStyle: "h3", descriptionStyle: "p" },
    { title: "Événement", description: "Séminaires, soirées, conférences.", href: "/evenement", image: null, titleStyle: "h3", descriptionStyle: "p" },
    { title: "Corporate", description: "Portraits, équipes, communication.", href: "/corporate", image: null, titleStyle: "h3", descriptionStyle: "p" },
  ],
};

export const DEFAULT_STATS: HomeStatsData = {
  items: [
    { value: "10+", label: "ans d'expérience" },
    { value: "500+", label: "projets réalisés" },
    { value: "100%", label: "sur mesure" },
    { value: "France", label: "& international" },
  ],
};

export const DEFAULT_PORTRAIT: HomePortraitBlockData = {
  blockTitle: "Portrait",
  ctaLabel: "Découvrir les portraits",
  ctaHref: "/portrait",
  carouselSpeed: 5000,
  slides: [
    { title: "Lifestyle", text: "Portraits en situation, en extérieur ou dans votre environnement. Une approche naturelle et spontanée.", image: null, image2: null, titleStyle: "h3", href: "/portrait?tab=lifestyle" },
    { title: "Studio", text: "Séances en studio avec lumière maîtrisée. Idéal pour les portraits professionnels et les visuels corporate.", image: null, image2: null, titleStyle: "h3", href: "/portrait?tab=studio" },
    { title: "Entreprise", text: "Portraits pour vos équipes et votre communication. Headshots et reportages en entreprise.", image: null, image2: null, titleStyle: "h3", href: "/portrait?tab=entreprise" },
    { title: "Couple", text: "Séances duo pour couples, associés ou binômes. Des images qui racontent votre complicité.", image: null, image2: null, titleStyle: "h3", href: "/portrait?tab=couple" },
  ],
};

export const DEFAULT_CADREUR: HomeCadreurBlockData = {
  title: "Cadreur",
  html: "<p>Cadreur vidéo pour des sociétés de production. Je peux assurer chef opérateur, cadreur, ou filmer et laisser le montage à la boîte de prod. Je travaille en équipe et dispose de mon propre matériel : caméra, micros, lumières.</p>",
  image: null,
  videos: [
    { url: "", title: "", description: "", visible: false },
    { url: "", title: "", description: "", visible: false },
    { url: "", title: "", description: "", visible: false },
  ],
  videoSettings: { borderRadius: 12, shadow: 'medium', glossy: false },
  videosSectionTitle: "",
  videosSectionTitleAlign: 'center',
};

export const DEFAULT_QUOTE: HomeQuoteData = {
  quotes: [
    { text: "Un professionnel à l'écoute, des images qui restent.", author: "Client", role: "Témoignage", authorStyle: "p", roleStyle: "p" },
    { text: "Une approche bienveillante et un rendu soigné. Je recommande.", author: "Client", role: "Portrait", authorStyle: "p", roleStyle: "p" },
    { text: "Des photos naturelles et des souvenirs précieux.", author: "Client", role: "Événement", authorStyle: "p", roleStyle: "p" },
  ],
  carouselSpeed: 5000,
};

export const DEFAULT_CTA: HomeCtaData = {
  title: "Un projet en tête ?",
  buttonLabel: "Contactez-moi",
  buttonHref: "/contact",
  buttonStyle: "1",
};

export const DEFAULT_ANIMATION: HomeAnimationBlockData = {
  blockTitle: "Animation",
  blockSubtitle: "De l'idée au rendu final — épisodes animés pour votre communication interne ou externe.",
  blockTitleStyle: "h2",
  blockSubtitleStyle: "p",
  blockTitleFontSize: 22,
  blockSubtitleFontSize: 16,
  image: null,
  imageRatio: '21:9',
  html: "",
};
