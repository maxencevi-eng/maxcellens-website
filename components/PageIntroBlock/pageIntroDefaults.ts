/**
 * Types et données par défaut du bloc intro des pages intérieures
 * (Réalisation, Événement, Corporate, Portrait)
 */

export const TITLE_FONT_SIZE_MIN = 8;
export const TITLE_FONT_SIZE_MAX = 200;

export type TitleStyleKey = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
export type AlignKey = 'left' | 'center' | 'right' | '';
export type PageIntroIconType = 'lucide' | 'image';

export type PageIntroFeature = {
  iconName?: string;
  iconType?: PageIntroIconType;
  iconImage?: { url: string; path?: string } | null;
  iconColor?: string;
  title?: string;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  titleColor?: string;
  titleAlign?: AlignKey;
  description?: string;
  descriptionStyle?: TitleStyleKey;
  descriptionFontSize?: number;
  descriptionColor?: string;
};

export type PageIntroBlockData = {
  eyebrow?: string;
  eyebrowColor?: string;
  eyebrowFontSize?: number;
  keywordsColor?: string;
  keywordsBorderColor?: string;
  keywordsBackground?: string;
  title?: string;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  titleColor?: string;
  titleAlign?: AlignKey;
  html?: string;
  features?: PageIntroFeature[];
  keywords?: string[];
  backgroundColor?: string;
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

/** Icônes Lucide disponibles dans le sélecteur */
export const AVAILABLE_ICONS: string[] = [
  // Vidéo / Photo
  'Camera', 'Video', 'Film', 'Play', 'Aperture', 'Image', 'Images',
  // Personnes
  'Users', 'User', 'UserPlus', 'UserCheck', 'UsersRound', 'UserCog',
  // Esthétique / Art
  'Heart', 'Star', 'Sparkles', 'Wand2', 'Paintbrush', 'Palette',
  // Environnement
  'Building2', 'Home', 'Landmark', 'MapPin', 'Globe',
  // Communication
  'Share2', 'Megaphone', 'MessageSquare', 'Mail', 'Phone',
  // Format / Layout
  'LayoutGrid', 'Layers', 'Monitor', 'Smartphone', 'MonitorPlay',
  // Lumière / Nature
  'Sun', 'Moon', 'Sunset', 'Lightbulb', 'Zap',
  // Award / Check
  'Award', 'Trophy', 'Medal', 'CheckCircle2', 'Target', 'Shield',
  // Outils
  'Pencil', 'Edit3', 'Scissors', 'Sliders', 'Settings',
  // Mouvement
  'ArrowRight', 'TrendingUp', 'ChevronRight',
  // Temps
  'Clock', 'Calendar', 'Timer',
  // Divers
  'Eye', 'Focus', 'Scan', 'Lock',
];

export const PAGE_INTRO_DEFAULTS: Record<string, PageIntroBlockData> = {
  evenement: {
    eyebrow: 'ÉVÉNEMENT',
    title: "Faites durer l'expérience au-delà du jour J",
    html: '<p><strong>Séminaires</strong>, lancements de produits ou <strong>soirées d\'entreprise</strong> : je capture l\'énergie et les <strong>temps forts</strong> de vos événements. Recevez un <strong>aftermovie</strong> dynamique et des <strong>photos immersives</strong>, prêts à être partagés pour remercier vos invités et communiquer sur votre réussite.</p>',
    features: [
      {
        iconName: 'Users',
        iconType: 'lucide',
        title: 'Discrétion sur le terrain',
        description: "Je m'intègre à vos événements sans perturber le déroulé, pour capter les moments authentiques, les prises de parole et les coulisses.",
      },
      {
        iconName: 'Play',
        iconType: 'lucide',
        title: 'Un aftermovie qui marque',
        description: "Au-delà du souvenir, un aftermovie professionnel c'est un contenu qui continue de rayonner longtemps après le jour J.",
      },
      {
        iconName: 'LayoutGrid',
        iconType: 'lucide',
        title: 'Formats adaptés à vos usages',
        description: "Chaque rendu est livré prêt à diffuser : communication interne, relations presse, ou publication sur vos canaux digitaux.",
      },
    ],
    keywords: ['Aftermovie', 'Reportage photo', 'Séminaire & conférence', "Soirée d'entreprise", 'Lancement de produit'],
  },
  corporate: {
    eyebrow: 'CORPORATE',
    title: 'Humanisez votre communication et affirmez vos valeurs',
    html: "<p>Parce que l'<strong>image de votre entreprise</strong> passe avant tout par ceux qui la composent. Je réalise vos <strong>films institutionnels</strong> (interviews, présentation d'activité) pour renforcer votre <strong>marque employeur</strong>, ainsi que des <strong>portraits corporate</strong> soignés pour mettre en lumière vos collaborateurs.</p>",
    features: [
      {
        iconName: 'Heart',
        iconType: 'lucide',
        title: "Vos équipes à l'honneur",
        description: 'Des portraits soignés et des interviews filmées qui mettent en lumière vos collaborateurs et renforcent votre attractivité employeur.',
      },
      {
        iconName: 'Building2',
        iconType: 'lucide',
        title: 'Dans votre environnement',
        description: "Je m'adapte à vos lieux — bureaux, showroom, extérieur — pour des visuels cohérents avec votre identité de marque.",
      },
      {
        iconName: 'Megaphone',
        iconType: 'lucide',
        title: 'Du recrutement à la comm interne',
        description: "Valorisez votre culture d'entreprise auprès de futurs talents, de vos clients ou en interne — chaque réalisation reflète fidèlement votre identité.",
      },
    ],
    keywords: ['Film institutionnel', 'Portrait collaborateur', 'Marque employeur', 'Communication interne', 'Interview vidéo'],
  },
  portrait: {
    eyebrow: 'PORTRAIT',
    title: 'Révélez votre personnalité en une image',
    html: '<p>Que ce soit pour soigner votre <strong>image professionnelle</strong> ou étoffer votre book, je vous guide pour capturer le portrait qui vous ressemble. En <strong>lumière naturelle</strong> ou <strong>en studio</strong>, une séance dirigée avec bienveillance pour un <strong>rendu authentique</strong> et percutant.</p>',
    features: [
      {
        iconName: 'Camera',
        iconType: 'lucide',
        title: 'Une séance bienveillante',
        description: "Je prends le temps de vous mettre à l'aise avant de déclencher — la justesse d'une expression ne s'impose pas, elle se construit.",
      },
      {
        iconName: 'Sun',
        iconType: 'lucide',
        title: 'Studio ou lumière naturelle',
        description: "Deux ambiances, un seul objectif : un portrait qui inspire confiance au premier regard — sur LinkedIn, un site web ou un dossier de presse.",
      },
      {
        iconName: 'Sparkles',
        iconType: 'lucide',
        title: 'Sélection & retouche incluses',
        description: "Chaque séance est suivie d'une sélection soignée et d'une retouche professionnelle pour un rendu prêt à l'emploi.",
      },
    ],
    keywords: ['Portrait LinkedIn', 'Book modèle', 'Studio & lumière naturelle', 'Retouche professionnelle', 'Dossier de presse'],
  },
  realisation: {
    eyebrow: 'RÉALISATION',
    title: 'Transformez votre audience en clients',
    html: '<p>Une <strong>vidéo commerciale</strong> ne doit pas seulement être belle, elle doit convaincre. Je réalise des <strong>clips promotionnels</strong> et des vidéos qui mettent en avant <strong>vos services et votre savoir-faire</strong>, pensés pour convaincre et dynamiser vos ventes.</p>',
    features: [
      {
        iconName: 'Layers',
        iconType: 'lucide',
        title: 'Sur-mesure de A à Z',
        description: "Du brief au rendu final, je m'adapte à vos objectifs, votre charte et vos délais — quel que soit la taille de votre structure.",
      },
      {
        iconName: 'Share2',
        iconType: 'lucide',
        title: 'Prêt à diffuser',
        description: 'Chaque contenu est livré dans les formats adaptés à vos usages : réseaux sociaux, site web, campagnes publicitaires.',
      },
      {
        iconName: 'Building2',
        iconType: 'lucide',
        title: 'PME & grands groupes',
        description: "Chaque projet est traité avec le même niveau d'exigence, que vous cherchiez à affirmer un positionnement ou à renouveler vos supports.",
      },
    ],
    keywords: ['Clip promotionnel', 'Présentation de service', 'Photo professionnelle', 'Réseaux sociaux', 'Campagne publicitaire'],
  },
};
