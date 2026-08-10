"use client";

import dynamic from 'next/dynamic';
import {
  BarChart3,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Link2,
  type LucideIcon,
  Menu as MenuIcon,
  Palette,
  PanelTop,
  Search,
  Settings2,
  Sparkles,
  Wrench,
} from 'lucide-react';

/**
 * Registre des entrées de l'espace d'administration.
 *
 * Ajouter une entrée = ajouter un objet ici. Plus de JSX à écrire dans la
 * barre latérale, plus d'état `showXxxModal` à déclarer, plus de `createPortal`
 * à câbler : `AdminShell` déduit tout de ce tableau.
 *
 * Les composants sont chargés dynamiquement, et — point important — les appels
 * à `dynamic()` sont faits AU NIVEAU DU MODULE. Dans l'ancienne barre latérale
 * ils étaient dans le corps du composant, ce qui recréait un composant à chaque
 * rendu et remontait la modale ouverte, effaçant les saisies en cours.
 */

const SiteStyleEditor = dynamic(() => import('../../SiteStyle/SiteStyleEditor'), { ssr: false });
const TransitionsEditor = dynamic(() => import('../../PageTransition/TransitionsEditor'), { ssr: false });
const SiteIdentityModal = dynamic(() => import('../modals/SiteIdentityModal'), { ssr: false });
const NavBarModal = dynamic(() => import('../modals/NavBarModal'), { ssr: false });
const MenuEditModal = dynamic(() => import('../../MenuEditModal/MenuEditModal'), { ssr: false });
const MobileMenuEditModal = dynamic(() => import('../../MobileMenuEditModal/MobileMenuEditModal'), { ssr: false });
const HeaderSettings = dynamic(() => import('../../HeaderSettings/HeaderSettings'), { ssr: false });
const FooterEditModal = dynamic(() => import('../../FooterEditModal/FooterEditModal'), { ssr: false });
const SocialLinksEditor = dynamic(() => import('../../SocialLinksEditor/SocialLinksEditor'), { ssr: false });
const SeoCommandCenterModal = dynamic(() => import('../../SeoCommandCenter/SeoCommandCenterModal'), { ssr: false });
const PageLayoutModal = dynamic(() => import('../../PageLayoutModal/PageLayoutModal'), { ssr: false });
const PagesManagerModal = dynamic(() => import('../../PageBuilder/PagesManagerModal'), { ssr: false });
const StatisticsModal = dynamic(() => import('../../Analytics/StatisticsModal'), { ssr: false });
const MaintenanceModal = dynamic(() => import('../../Analytics/MaintenanceModal'), { ssr: false });

export type AdminEntryGroup = 'apparence' | 'structure' | 'contenu' | 'donnees';

export type AdminEntry = {
  id: string;
  label: string;
  /** Aide affichée dans la recherche et en infobulle. */
  description: string;
  icon: LucideIcon;
  group: AdminEntryGroup;
  /** Termes supplémentaires pris en compte par la recherche. */
  keywords?: string[];
  /** Rend la modale. `close` la ferme, `open` en ouvre une autre par son id. */
  render: (ctx: {
    close: () => void;
    open: (id: string) => void;
  }) => React.ReactNode;
};

export const ADMIN_GROUPS: { id: AdminEntryGroup; label: string }[] = [
  { id: 'apparence', label: 'Apparence' },
  { id: 'structure', label: 'Structure' },
  { id: 'contenu', label: 'Contenu' },
  { id: 'donnees', label: 'Données' },
];

export const ADMIN_ENTRIES: AdminEntry[] = [
  /* ── Apparence ─────────────────────────────────────────────────────── */
  {
    id: 'style',
    label: 'Style du site',
    description: 'Couleurs, typographies, polices, fond et interface admin',
    icon: Palette,
    group: 'apparence',
    keywords: ['couleur', 'police', 'font', 'typographie', 'thème', 'fond'],
    render: ({ close }) => <SiteStyleEditor onClose={close} />,
  },
  {
    id: 'transitions',
    label: 'Transitions & effets',
    description: 'Animation lors d’un changement de page',
    icon: Sparkles,
    group: 'apparence',
    keywords: ['animation', 'rideau', 'fondu', 'navigation'],
    render: ({ close }) => <TransitionsEditor onClose={close} />,
  },
  {
    id: 'identity',
    label: 'Identité visuelle',
    description: 'Logo du site, favicon, logo du pied de page',
    icon: ImageIcon,
    group: 'apparence',
    keywords: ['logo', 'favicon', 'icône', 'marque'],
    render: ({ close }) => <SiteIdentityModal onClose={close} />,
  },

  /* ── Structure ─────────────────────────────────────────────────────── */
  {
    id: 'pages',
    label: 'Pages',
    description: 'Créer, organiser, publier et supprimer les pages du site',
    icon: FileText,
    group: 'structure',
    keywords: ['page', 'créer', 'nouvelle', 'slug', 'publier', 'brouillon'],
    render: ({ close }) => <PagesManagerModal onClose={close} />,
  },
  {
    id: 'nav',
    label: 'Barre de navigation',
    description: 'Hauteur, espacement, contenu du menu et du menu mobile',
    icon: MenuIcon,
    group: 'structure',
    keywords: ['menu', 'nav', 'navigation', 'mobile'],
    render: ({ close, open }) => (
      <NavBarModal
        onClose={close}
        onOpenMenuEditor={() => open('menu')}
        onOpenMobileMenuEditor={() => open('menu-mobile')}
      />
    ),
  },
  {
    id: 'menu',
    label: 'Menu du site',
    description: 'Liens, libellés et ordre du menu principal',
    icon: MenuIcon,
    group: 'structure',
    keywords: ['lien', 'menu', 'ordre'],
    render: ({ close }) => <MenuEditModal onClose={close} />,
  },
  {
    id: 'menu-mobile',
    label: 'Menu mobile',
    description: 'Contenu du menu affiché sur petit écran',
    icon: MenuIcon,
    group: 'structure',
    keywords: ['mobile', 'burger', 'menu'],
    render: ({ close }) => <MobileMenuEditModal onClose={close} />,
  },
  {
    id: 'header',
    label: 'Header',
    description: 'Hauteur, largeur et voile de l’image d’en-tête',
    icon: PanelTop,
    group: 'structure',
    keywords: ['entête', 'bandeau', 'hero', 'image'],
    render: ({ close }) => <HeaderSettings open onClose={close} />,
  },
  {
    id: 'layout',
    label: 'Dimensions & mise en page',
    description: 'Largeurs, marges et espacement entre sections',
    icon: LayoutTemplate,
    group: 'structure',
    keywords: ['largeur', 'marge', 'padding', 'espace', 'grille'],
    render: ({ close }) => <PageLayoutModal onClose={close} />,
  },
  {
    id: 'footer',
    label: 'Pied de page',
    description: 'Colonnes, textes et mentions du footer',
    icon: Layers,
    group: 'structure',
    keywords: ['footer', 'bas de page', 'mentions'],
    render: ({ close }) => <FooterEditModal onClose={close} />,
  },
  {
    id: 'socials',
    label: 'Réseaux sociaux',
    description: 'Liens et icônes des réseaux',
    icon: Link2,
    group: 'structure',
    keywords: ['instagram', 'facebook', 'linkedin', 'réseau', 'social'],
    render: ({ close }) => <SocialLinksEditor onClose={close} />,
  },

  /* ── Données ───────────────────────────────────────────────────────── */
  {
    id: 'seo',
    label: 'SEO',
    description: 'Titres, descriptions, images de partage et données structurées',
    icon: Search,
    group: 'donnees',
    keywords: ['référencement', 'meta', 'opengraph', 'sitemap', 'google'],
    render: ({ close }) => <SeoCommandCenterModal onClose={close} />,
  },
  {
    id: 'stats',
    label: 'Statistiques',
    description: 'Fréquentation, pages vues et sources de trafic',
    icon: BarChart3,
    group: 'donnees',
    keywords: ['analytics', 'visites', 'trafic', 'audience'],
    render: ({ close }) => <StatisticsModal onClose={close} />,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Mode maintenance, purge des données et diagnostics',
    icon: Wrench,
    group: 'donnees',
    keywords: ['purge', 'nettoyage', 'diagnostic', 'santé'],
    render: ({ close }) => <MaintenanceModal onClose={close} />,
  },
];

/** Entrées affichées dans la barre latérale (les autres restent accessibles par recherche). */
export const SIDEBAR_HIDDEN_ENTRIES = new Set(['menu', 'menu-mobile']);

export function findEntry(id: string): AdminEntry | undefined {
  return ADMIN_ENTRIES.find((e) => e.id === id);
}

/** Recherche simple, insensible à la casse et aux accents. */
export function searchEntries(query: string): AdminEntry[] {
  const q = normalize(query.trim());
  if (!q) return ADMIN_ENTRIES;
  return ADMIN_ENTRIES.filter((e) => {
    const haystack = normalize(
      [e.label, e.description, ...(e.keywords || [])].join(' ')
    );
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
}

function normalize(s: string): string {
  // U+0300–U+036F : marques diacritiques combinantes, retirées après NFD
  // pour que « reseaux » trouve « réseaux ».
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Icônes réexportées pour les écrans qui composent leurs propres actions. */
export { Settings2 };
