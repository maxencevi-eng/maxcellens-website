/**
 * Données par défaut des blocs de la page d'accueil (éditables via modale).
 */

export type HomeIntroData = {
  title?: string;
  subtitle?: string;
  html?: string;
};

export type HomeServiceItem = { title: string; description: string; href: string };
export type HomeServicesData = { items: HomeServiceItem[] };

export type HomeStatItem = { value: string; label: string };
export type HomeStatsData = { items: HomeStatItem[] };

export type HomeSectionData = { title: string; description: string };

export type HomeQuoteData = { text: string; author: string; role?: string };

export type HomeCtaData = { title: string; buttonLabel: string; buttonHref: string };

export const DEFAULT_INTRO: HomeIntroData = {
  title: "Maxcellens",
  subtitle: "Photographe professionnel — Portrait, Événement, Corporate",
  html: "<p>Portrait, événementiel, corporate et réalisation. Basé en Île-de-France, j'interviens partout en France et à l'étranger pour donner vie à vos projets en image.</p>",
};

export const DEFAULT_SERVICES: HomeServicesData = {
  items: [
    { title: "Réalisation", description: "Reportages photo et vidéo sur mesure.", href: "/realisation" },
    { title: "Événement", description: "Mariages, séminaires, soirées.", href: "/evenement" },
    { title: "Corporate", description: "Portraits, équipes, communication.", href: "/corporate" },
    { title: "Portrait", description: "Séances portrait professionnelles.", href: "/portrait" },
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

export const DEFAULT_PROJECTS_SECTION: HomeSectionData = {
  title: "Sélection de projets",
  description: "Quelques reportages photo récents — cliquez pour découvrir.",
};

export const DEFAULT_VIDEOS_SECTION: HomeSectionData = {
  title: "Nos Réalisations",
  description: "Une sélection de vidéos récentes — cliquez pour lancer la lecture.",
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
