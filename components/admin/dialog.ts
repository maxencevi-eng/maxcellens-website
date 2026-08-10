/**
 * Dialogues d'administration — confirmation, saisie, information.
 *
 * Remplace `window.confirm`, `window.prompt` et `window.alert`, qui affichent
 * la boîte native du navigateur : impossible à styler, texte tronqué, et
 * surtout bloquante (elle gèle le fil d'exécution, ce qui interrompt les
 * animations et les requêtes en cours).
 *
 * API impérative volontairement : la plupart des appelants sont des
 * gestionnaires d'événements qui ont besoin d'une réponse avant de continuer.
 * Une API à base de contexte les obligerait à remonter un état.
 *
 *   if (await confirmDialog({ title: 'Supprimer ?' })) { … }
 *
 * Ce module ne dépend ni de React ni d'AdminModal : c'est ce qui permet à
 * `AdminModal` lui-même de l'utiliser pour son garde-fou de fermeture sans
 * créer d'import circulaire. Le rendu est assuré par `AdminDialogHost`.
 */

export type DialogTone = 'default' | 'danger';

export type ConfirmRequest = {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

export type PromptRequest = {
  kind: 'prompt';
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  /**
   * Saisie de sécurité : le bouton de confirmation reste inactif tant que la
   * valeur ne correspond pas exactement. Utilisé pour la suppression de page.
   */
  mustMatch?: string;
};

export type AlertRequest = {
  kind: 'alert';
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: DialogTone;
};

export type DialogRequest = ConfirmRequest | PromptRequest | AlertRequest;

/** Résultat : booléen pour confirm/alert, chaîne ou null pour prompt. */
export type DialogResult = boolean | string | null;

type PendingDialog = {
  id: number;
  request: DialogRequest;
  resolve: (result: DialogResult) => void;
};

type Listener = (dialog: PendingDialog | null) => void;

let nextId = 1;
/** File d'attente : un second dialogue demandé pendant qu'un premier est
 *  ouvert s'affiche à sa fermeture plutôt que d'être perdu. */
let queue: PendingDialog[] = [];
let listeners: Listener[] = [];

function notify() {
  const current = queue[0] ?? null;
  listeners.forEach((l) => l(current));
}

/** Abonnement de `AdminDialogHost`. */
export function subscribeToDialogs(listener: Listener): () => void {
  listeners.push(listener);
  listener(queue[0] ?? null);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** Appelé par l'hôte quand l'utilisateur répond. */
export function resolveDialog(id: number, result: DialogResult) {
  const index = queue.findIndex((d) => d.id === id);
  if (index < 0) return;
  const [dialog] = queue.splice(index, 1);
  dialog.resolve(result);
  notify();
}

function enqueue(request: DialogRequest): Promise<DialogResult> {
  return new Promise((resolve) => {
    // Hors navigateur (rendu serveur), on ne peut rien demander : on refuse
    // plutôt que de bloquer indéfiniment.
    if (typeof window === 'undefined') {
      resolve(request.kind === 'prompt' ? null : false);
      return;
    }
    queue.push({ id: nextId++, request, resolve });
    notify();
  });
}

/** Demande une confirmation. Résout à `true` si l'utilisateur accepte. */
export async function confirmDialog(
  options: Omit<ConfirmRequest, 'kind'>
): Promise<boolean> {
  const result = await enqueue({ kind: 'confirm', ...options });
  return result === true;
}

/** Demande une saisie. Résout à la valeur, ou `null` si annulé. */
export async function promptDialog(
  options: Omit<PromptRequest, 'kind'>
): Promise<string | null> {
  const result = await enqueue({ kind: 'prompt', ...options });
  return typeof result === 'string' ? result : null;
}

/** Affiche une information. Résout quand l'utilisateur ferme. */
export async function alertDialog(
  options: Omit<AlertRequest, 'kind'>
): Promise<void> {
  await enqueue({ kind: 'alert', ...options });
}
