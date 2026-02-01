/**
 * Données par défaut des blocs de la page d'accueil (éditables via modale).
 */

export type HomeIntroData = {
  title?: string;
  subtitle?: string;
  html?: string;
};

export type HomeServiceItem = {
  title: string;
  description: string;
  href: string;
  image?: { url: string; path?: string } | null;
};
export type HomeServicesData = { items: HomeServiceItem[] };

export type HomeStatItem = { value: string; label: string };
export type HomeStatsData = { items: HomeStatItem[] };

export type HomePortraitSlide = {
  title: string;
  text: string;
  image?: { url: string; path?: string } | null;
};

export type HomePortraitBlockData = {
  blockTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  slides: HomePortraitSlide[];
};

export type HomeCadreurBlockData = {
  title?: string;
  html?: string;
  image?: { url: string; path?: string } | null;
};

export type HomeQuoteData = { text: string; author: string; role?: string };

export type HomeCtaData = { title: string; buttonLabel: string; buttonHref: string };

export const DEFAULT_INTRO: HomeIntroData = {
  title: "Maxcellens",
  subtitle: "Photographe professionnel — Portrait, Événement, Corporate",
  html: "<p>Portrait, événementiel, corporate et réalisation. Basé en Île-de-France, j'interviens partout en France et à l'étranger pour donner vie à vos projets en image.</p>",
};

export const DEFAULT_SERVICES: HomeServicesData = {
  items: [
    { title: "Réalisation", description: "Reportages photo et vidéo sur mesure.", href: "/realisation", image: null },
    { title: "Événement", description: "Mariages, séminaires, soirées.", href: "/evenement", image: null },
    { title: "Corporate", description: "Portraits, équipes, communication.", href: "/corporate", image: null },
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
  ctaLabel: "Découvrir le portrait",
  ctaHref: "/portrait",
  slides: [
    { title: "Lifestyle", text: "Portraits en situation, en extérieur ou dans votre environnement. Une approche naturelle et spontanée.", image: null },
    { title: "Studio", text: "Séances en studio avec lumière maîtrisée. Idéal pour les portraits professionnels et les visuels corporate.", image: null },
    { title: "Entreprise", text: "Portraits pour vos équipes et votre communication. Headshots et reportages en entreprise.", image: null },
    { title: "Couple", text: "Séances duo pour couples, associés ou binômes. Des images qui racontent votre complicité.", image: null },
  ],
};

export const DEFAULT_CADREUR: HomeCadreurBlockData = {
  title: "Cadreur",
  html: "<p>Cadreur vidéo pour des sociétés de production. Je peux assurer chef opérateur, cadreur, ou filmer et laisser le montage à la boîte de prod. Je travaille en équipe et dispose de mon propre matériel : caméra, micros, lumières.</p>",
  image: null,
};

export const DEFAULT_QUOTE: HomeQuoteData = {
  text: "Un professionnel à l'écoute, des images qui restent.",
  author: "Client",
  role: "Témoignage",
};

export const DEFAULT_CTA: HomeCtaData = {
  title: "Un projet en tête ?",
  buttonLabel: "Contactez-moi",
  buttonHref: "/contact",
};
