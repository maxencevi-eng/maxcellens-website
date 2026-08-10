/**
 * Entrées de menu — pages intégrées ET pages créées depuis l'administration.
 *
 * Partagé par le menu de bureau, le menu mobile et la navigation du pied de
 * page, afin que les trois proposent exactement les mêmes entrées, dans un
 * ordre que l'utilisateur contrôle.
 *
 * Utilisable côté serveur : aucune dépendance React.
 */

export type MenuItem = {
  /** Identifiant stable : `builtin:contact` ou `page:<slug>`. */
  id: string;
  label: string;
  href: string;
  /** Une entrée intégrée ne peut pas être supprimée, seulement masquée. */
  builtin: boolean;
};

/** Entrées historiques, dans leur ordre d'origine. */
export const BUILTIN_MENU_ITEMS: { key: string; label: string; href: string }[] = [
  { key: 'realisation', label: 'Réalisation', href: '/realisation' },
  { key: 'evenement', label: 'Évènement', href: '/evenement' },
  { key: 'corporate', label: 'Corporate', href: '/corporate' },
  { key: 'portrait', label: 'Portrait', href: '/portrait' },
  { key: 'animation', label: 'Animation', href: '/animation' },
  { key: 'galleries', label: 'Galeries', href: '/galeries' },
  { key: 'contact', label: 'Contact', href: '/contact' },
  { key: 'bac', label: 'Bureau à la Carte', href: '/bac' },
  { key: 'admin', label: 'Admin', href: '/admin' },
  { key: 'mentionsLegales', label: 'Mentions légales', href: '/mentions-legales' },
  {
    key: 'politiqueConfidentialite',
    label: 'Politique de confidentialité',
    href: '/politique-de-confidentialite',
  },
];

export function builtinItemId(key: string) {
  return `builtin:${key}`;
}

/**
 * Entrées réservées à une session connectée.
 *
 * Leur réglage de visibilité dans l'éditeur de menu ne s'applique pas : un
 * visiteur ne les voit jamais, un administrateur les voit toujours. Cela évite
 * d'exposer publiquement le chemin de l'espace d'administration parce qu'une
 * case a été laissée cochée.
 */
export const ADMIN_ONLY_ITEM_IDS = new Set<string>([builtinItemId('admin')]);

export function isAdminOnlyItem(id: string): boolean {
  return ADMIN_ONLY_ITEM_IDS.has(id);
}

export function pageItemId(slug: string) {
  return `page:${slug}`;
}

/** Extrait la clé historique d'un identifiant `builtin:*`. */
export function builtinKeyOf(id: string): string | null {
  return id.startsWith('builtin:') ? id.slice('builtin:'.length) : null;
}

/** Extrait le slug d'un identifiant `page:*`. */
export function pageSlugOf(id: string): string | null {
  return id.startsWith('page:') ? id.slice('page:'.length) : null;
}

/**
 * Construit la liste complète des entrées disponibles.
 *
 * Les pages créées depuis l'admin s'ajoutent aux entrées historiques ; c'est
 * ce qui manquait pour qu'une nouvelle page publiée apparaisse dans les
 * éditeurs de menu.
 */
export function buildMenuItems(
  dynamicPages: { slug: string; title: string }[]
): MenuItem[] {
  return [
    ...BUILTIN_MENU_ITEMS.map((b) => ({
      id: builtinItemId(b.key),
      label: b.label,
      href: b.href,
      builtin: true,
    })),
    ...dynamicPages.map((p) => ({
      id: pageItemId(p.slug),
      label: p.title || p.slug,
      href: `/${p.slug}`,
      builtin: false,
    })),
  ];
}

/**
 * Applique un ordre sauvegardé à la liste des entrées.
 *
 * Les entrées absentes de l'ordre (nouvelle page, nouvelle entrée du code)
 * sont ajoutées à la fin plutôt que perdues ; les identifiants inconnus
 * (page supprimée) sont écartés.
 */
export function applyMenuOrder(items: MenuItem[], order: unknown): MenuItem[] {
  if (!Array.isArray(order)) return items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered: MenuItem[] = [];

  for (const raw of order) {
    if (typeof raw !== 'string') continue;
    const item = byId.get(raw);
    if (item) {
      ordered.push(item);
      byId.delete(raw);
    }
  }
  // Ce qui reste n'était pas dans l'ordre sauvegardé
  for (const item of items) {
    if (byId.has(item.id)) ordered.push(item);
  }
  return ordered;
}

/** Lit un ordre stocké en base (JSON) sans jeter en cas de valeur illisible. */
export function parseMenuOrder(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Lit une table de visibilité stockée en base. */
export function parseMenuVisible(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Visibilité effective d'une entrée.
 *
 * Rétrocompatibilité : les anciens enregistrements indexent par clé nue
 * (`contact`) et non par identifiant (`builtin:contact`). On accepte les deux,
 * sinon toutes les entrées disparaîtraient au premier chargement.
 */
export function isItemVisible(
  item: MenuItem,
  visible: Record<string, boolean>,
  defaults: Record<string, boolean> = {}
): boolean {
  if (item.id in visible) return Boolean(visible[item.id]);
  const key = builtinKeyOf(item.id);
  if (key && key in visible) return Boolean(visible[key]);
  if (item.id in defaults) return Boolean(defaults[item.id]);
  if (key && key in defaults) return Boolean(defaults[key]);
  // Une page créée depuis l'admin n'apparaît que si on l'active explicitement.
  return item.builtin ? false : false;
}

/**
 * Entrées réellement affichables, dans l'ordre.
 *
 * Point unique de décision, partagé par le menu de bureau, le menu mobile et
 * le pied de page : les trois appliquent donc exactement les mêmes règles.
 */
export function visibleMenuItems(
  items: MenuItem[],
  visible: Record<string, boolean>,
  defaults: Record<string, boolean>,
  isAdmin: boolean
): MenuItem[] {
  return items.filter((item) => {
    // La session prime sur le réglage de visibilité.
    if (isAdminOnlyItem(item.id)) return isAdmin;
    return isItemVisible(item, visible, defaults);
  });
}
