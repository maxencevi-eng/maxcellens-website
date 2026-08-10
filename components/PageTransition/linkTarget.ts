/**
 * Décide si un clic sur un lien doit déclencher une transition de page.
 *
 * L'ancienne version interceptait tous les `<a>` en phase capture, ce qui
 * cassait : les liens de téléchargement, les liens dans les modales admin, et
 * rejouait une transition sur `/contact/` depuis `/contact`.
 */

export type LinkDecision =
  | { kind: 'ignore' }
  | { kind: 'navigate'; href: string; tab?: string }
  | { kind: 'sameTab'; tab: string; scrollId: string };

/** Pages dont les onglets sont gérés par SubmenuPageClient. */
const SUBMENU_PAGES = ['/corporate', '/realisation', '/evenement'];

/** Retire le slash final et normalise la casse du chemin pour comparer. */
export function normalizePath(path: string): string {
  if (!path) return '/';
  const stripped = path.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
}

export function decideLink(
  link: HTMLAnchorElement,
  event: MouseEvent,
  currentPathname: string
): LinkDecision {
  // Navigation en nouvel onglet ou avec modificateur : laisser le navigateur.
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return { kind: 'ignore' };
  }

  // Un lien de téléchargement ne doit jamais être intercepté.
  if (link.hasAttribute('download')) return { kind: 'ignore' };
  if (link.target && link.target !== '_self') return { kind: 'ignore' };
  if (/\bexternal\b/i.test(link.rel || '')) return { kind: 'ignore' };
  // Échappatoire explicite pour un lien qui doit garder le comportement natif.
  if (link.hasAttribute('data-no-transition')) return { kind: 'ignore' };

  // Toute l'interface d'administration est hors transition : cliquer un lien
  // dans une modale ne doit pas déclencher un rideau plein écran.
  if (link.closest('[data-admin-ui]')) return { kind: 'ignore' };

  const rawHref = link.getAttribute('href');
  if (!rawHref) return { kind: 'ignore' };
  // Protocoles externes et ancres pures
  if (/^(https?:|mailto:|tel:|sms:|#|javascript:)/i.test(rawHref)) {
    // Un lien http(s) vers le site lui-même reste externe du point de vue du
    // routeur : on laisse le navigateur faire, c'est le comportement attendu.
    return { kind: 'ignore' };
  }

  let url: URL;
  try {
    url = new URL(rawHref, window.location.origin);
  } catch {
    return { kind: 'ignore' };
  }
  if (url.origin !== window.location.origin) return { kind: 'ignore' };

  const tab = url.searchParams.get('tab');
  if (tab) url.searchParams.delete('tab');

  const search = url.searchParams.toString();
  const targetPath = url.pathname + (search ? `?${search}` : '') + url.hash;
  const samePage = normalizePath(url.pathname) === normalizePath(currentPathname);

  if (tab && samePage) {
    // Même page, simple changement d'onglet : pas de navigation ni de rideau.
    const scrollId = SUBMENU_PAGES.includes(normalizePath(url.pathname))
      ? 'submenu-gallery-nav'
      : 'portrait-gallery-nav';
    return { kind: 'sameTab', tab, scrollId };
  }

  // Même page sans changement d'onglet : rien à faire.
  if (samePage && !url.hash) return { kind: 'ignore' };
  // Ancre interne à la page courante : laisser le défilement natif.
  if (samePage && url.hash) return { kind: 'ignore' };

  return { kind: 'navigate', href: targetPath, tab: tab || undefined };
}

/** Cible de défilement à mémoriser avant une navigation vers un onglet. */
export function scrollTargetForTab(pathname: string): string | null {
  return SUBMENU_PAGES.includes(normalizePath(pathname))
    ? 'submenu-gallery-nav'
    : null;
}
