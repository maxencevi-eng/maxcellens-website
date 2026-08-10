/**
 * Pile de modales admin.
 *
 * Sert deux besoins que l'ancien `Modal` ne couvrait pas :
 *  1. Escape ne doit fermer que la modale du DESSUS, pas toutes.
 *  2. Le scroll du body ne doit être rendu qu'à la fermeture de la DERNIÈRE
 *     modale (sinon une modale imbriquée qui se ferme relâche le scroll).
 *
 * Module-level (pas un contexte React) : les modales sont ouvertes depuis des
 * endroits très différents de l'arbre (sidebar, blocs de page, toolbars) et
 * n'ont pas d'ancêtre commun autre que la racine.
 */

let stack: string[] = [];
let scrollLockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';
let savedScrollY = 0;

/**
 * Verrouille le défilement pendant qu'une modale est ouverte.
 *
 * Le verrou porte sur `documentElement`, pas sur `body`.
 *
 * `globals.css` donne `height: 100%` au body : lui appliquer
 * `overflow: hidden` en faisait un conteneur de hauteur fixe, qui rognait son
 * contenu et ramenait la vue en haut de page. Ouvrir la confirmation de
 * suppression d'un bloc situé en bas de page renvoyait donc l'utilisateur au
 * sommet.
 *
 * `documentElement` est l'élément qui défile réellement : le figer conserve sa
 * position. La position est malgré tout mémorisée et restaurée, pour ne
 * dépendre d'aucun comportement de navigateur.
 */
function lockScroll() {
  if (scrollLockCount === 0 && typeof document !== 'undefined') {
    const root = document.documentElement;
    savedScrollY = window.scrollY;
    savedOverflow = root.style.overflow;
    savedPaddingRight = root.style.paddingRight;

    const scrollbarWidth = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    // Évite le saut horizontal du contenu quand la scrollbar disparaît
    if (scrollbarWidth > 0) {
      const current = parseFloat(getComputedStyle(root).paddingRight) || 0;
      root.style.paddingRight = `${current + scrollbarWidth}px`;
    }
  }
  scrollLockCount += 1;
}

function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0 && typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.overflow = savedOverflow;
    root.style.paddingRight = savedPaddingRight;

    // Filet de sécurité : si la position a dérivé pendant l'ouverture, on la
    // rétablit sans animation.
    if (Math.abs(window.scrollY - savedScrollY) > 1) {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
    }
  }
}

export function pushModal(id: string) {
  stack.push(id);
  lockScroll();
}

export function popModal(id: string) {
  stack = stack.filter((x) => x !== id);
  unlockScroll();
}

/** true si `id` est la modale au sommet de la pile (celle qui reçoit Escape). */
export function isTopModal(id: string) {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** Profondeur d'empilement, utilisée pour décaler le z-index. */
export function modalDepth(id: string) {
  const i = stack.indexOf(id);
  return i < 0 ? 0 : i;
}
