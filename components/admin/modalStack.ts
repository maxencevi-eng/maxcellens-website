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
let savedBodyPaddingRight = '';
let savedBodyOverflow = '';

/** Verrouille le scroll du body en compensant la largeur de la scrollbar. */
function lockScroll() {
  if (scrollLockCount === 0 && typeof document !== 'undefined') {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    savedBodyOverflow = document.body.style.overflow;
    savedBodyPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    // Évite le saut horizontal du contenu quand la scrollbar disparaît
    if (scrollbarWidth > 0) {
      const current = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
  }
  scrollLockCount += 1;
}

function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0 && typeof document !== 'undefined') {
    document.body.style.overflow = savedBodyOverflow;
    document.body.style.paddingRight = savedBodyPaddingRight;
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
