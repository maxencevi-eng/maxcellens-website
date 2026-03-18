/**
 * Données par défaut des blocs de la page d'accueil (éditables via modale).
 */

/** Taille de titre en px (8–200). */
export const TITLE_FONT_SIZE_MIN = 8;
export const TITLE_FONT_SIZE_MAX = 200;

export type HomeIntroData = {
  /** Sur-titre affiché en haut du bloc (ex. « MAXCELLENS — VIDÉASTE & PHOTOGRAPHE »). */
  eyebrow?: string;
  eyebrowFontSize?: number;
  eyebrowColor?: string;
  eyebrowAlign?: 'left' | 'center' | 'right';
  /** Titre en texte brut (rétrocompat). Supplanté par titleHtml si défini. */
  title?: string;
  /** Titre en HTML riche (gras, italique, etc.). Prioritaire sur title. */
  titleHtml?: string;
  titleStyle?: TitleStyleKey;
  /** Taille du titre en px (8–200). */
  titleFontSize?: number;
  /** Couleur personnalisée du titre (hex). */
  titleColor?: string;
  titleAlign?: 'left' | 'center' | 'right';
  /** Image affichée à droite du titre. */
  image?: { url: string; path?: string; focus?: FocusPoint } | null;
  /** Incline légèrement l'image (effet carte penchée). */
  imageTilted?: boolean;
  /** HTML de description (colonne basse gauche). */
  html?: string;
  /** HTML de la liste de services (colonne basse droite, alignée à droite). */
  servicesHtml?: string;
  /** Couleur de fond du bloc (remplace le style global des blocs) */
  backgroundColor?: string;
  /** Arrondi haut de la section (px). Remplace le CSS par défaut si défini. */
  borderRadiusTop?: number;
  /** Arrondi bas de la section (px). Remplace le CSS par défaut si défini. */
  borderRadiusBottom?: number;
  /** Padding vertical interne haut (px). Remplace le CSS par défaut si défini. */
  paddingTop?: number;
  /** Padding vertical interne bas (px). Remplace le CSS par défaut si défini. */
  paddingBottom?: number;
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
  /** Couleur personnalisée du titre du bloc (hex). */
  blockTitleColor?: string;
  /** Couleur personnalisée du sous-titre du bloc (hex). */
  blockSubtitleColor?: string;
  blockTitleAlign?: 'left' | 'center' | 'right';
  blockSubtitleAlign?: 'left' | 'center' | 'right';
  items: HomeServiceItem[];
  backgroundColor?: string;
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export type HomeStatItem = { value: string; label: string };
export type HomeStatsData = {
  items: HomeStatItem[];
  backgroundColor?: string;
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

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
  /** Couleur personnalisée du titre du bloc (hex). */
  blockTitleColor?: string;
  blockTitleAlign?: 'left' | 'center' | 'right';
  ctaLabel?: string;
  ctaHref?: string;
  ctaButtonStyle?: '1' | '2';
  carouselSpeed?: number;
  slides: HomePortraitSlide[];
  backgroundColor?: string;
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
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
  /** Couleur personnalisée du titre (hex). */
  titleColor?: string;
  titleAlign?: 'left' | 'center' | 'right';
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
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export type HomeQuoteItem = { text: string; author: string; role?: string; authorStyle?: TitleStyleKey; roleStyle?: TitleStyleKey };
export type HomeQuoteData = {
  blockTitle?: string;
  blockSubtitle?: string;
  blockTitleStyle?: TitleStyleKey;
  blockSubtitleStyle?: TitleStyleKey;
  blockTitleFontSize?: number;
  blockSubtitleFontSize?: number;
  /** Couleur personnalisée du titre du bloc (hex). */
  blockTitleColor?: string;
  blockSubtitleColor?: string;
  blockTitleAlign?: 'left' | 'center' | 'right';
  blockSubtitleAlign?: 'left' | 'center' | 'right';
  quotes: HomeQuoteItem[];
  carouselSpeed?: number;
  backgroundColor?: string;
  /** Couleur de fond des cartes témoignages */
  cardBackground?: string;
  /** Couleur de la bordure haute des cartes témoignages */
  cardBorderColor?: string;
  /** Couleur du texte des cartes (nom auteur + citation) */
  cardTextColor?: string;
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export type HomeCtaData = {
  title: string;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  /** Couleur personnalisée du titre (hex). */
  titleColor?: string;
  titleAlign?: 'left' | 'center' | 'right';
  buttonLabel: string;
  buttonHref: string;
  buttonStyle?: '1' | '2';
  backgroundColor?: string;
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export type HomeAnimationBlockData = {
  blockTitle?: string;
  blockSubtitle?: string;
  blockTitleStyle?: TitleStyleKey;
  blockSubtitleStyle?: TitleStyleKey;
  blockTitleFontSize?: number;
  blockSubtitleFontSize?: number;
  /** Couleur personnalisée du titre du bloc (hex). */
  blockTitleColor?: string;
  /** Couleur personnalisée du sous-titre du bloc (hex). */
  blockSubtitleColor?: string;
  blockTitleAlign?: 'left' | 'center' | 'right';
  blockSubtitleAlign?: 'left' | 'center' | 'right';
  /** Couleur de fond de la carte de contenu superposée (hex). */
  contentBgColor?: string;
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
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export const DEFAULT_INTRO: HomeIntroData = {
  eyebrow: "Maxcellens — Vidéaste & Photographe",
  title: "Donnez de la force à votre image.",
  html: "<p>Photo et vidéo professionnelles pour entreprises, marques et événements. Basé à Clamart, j'interviens partout en France et à l'étranger.</p>",
  servicesHtml: "<p>Vidéo commerciale<br>Couverture événementielle<br>Portrait corporate<br>Cadreur institutionnel</p>",
  backgroundColor: "#13100D",
  titleColor: "#F5F0E8",
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

export type HomeBannerData = {
  /** Image de la bannière */
  image?: { url: string; path?: string; focus?: FocusPoint } | null;
  /** Ratio d'image (mode sans texte uniquement) */
  imageRatio?: AnimationImageRatio;
  /** Couleur de fond (remplace l'image si pas d'image) */
  backgroundColor?: string;
  /** Arrondi haut de la section */
  borderRadiusTop?: number;
  /** Arrondi bas de la section */
  borderRadiusBottom?: number;
  /** Padding vertical interne haut */
  paddingTop?: number;
  /** Padding vertical interne bas */
  paddingBottom?: number;
  /** Mode d'affichage : 'none' = bannière image seule, 'text' = texte + image côte à côte */
  textMode?: 'none' | 'text';
  /** Position de l'image en mode texte : 'left' | 'right' */
  textImagePosition?: 'left' | 'right';
  /** Texte d'accroche (eyebrow/label au-dessus du titre, mode texte) */
  eyebrow?: string;
  /** Titre principal (mode texte) */
  blockTitle?: string;
  blockTitleStyle?: TitleStyleKey;
  blockTitleFontSize?: number;
  blockTitleColor?: string;
  blockTitleAlign?: 'left' | 'center' | 'right';
  /** Sous-titre (mode texte) */
  blockSubtitle?: string;
  blockSubtitleStyle?: TitleStyleKey;
  blockSubtitleFontSize?: number;
  blockSubtitleColor?: string;
  blockSubtitleAlign?: 'left' | 'center' | 'right';
  /** Texte riche (mode texte) */
  html?: string;
  /** Bouton CTA (mode texte) */
  ctaLabel?: string;
  ctaHref?: string;
  ctaButtonStyle?: '1' | '2';
};

export const DEFAULT_BANNER: HomeBannerData = {
  imageRatio: "21:9",
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
