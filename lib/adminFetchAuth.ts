/**
 * Ajoute le jeton de session admin aux appels `/api/*` du site.
 *
 * Les routes d'écriture exigent `Authorization: Bearer <jeton Supabase>`
 * (voir `lib/adminAuth.ts`). Plutôt que de modifier chaque `fetch` des modales
 * d'édition, on enveloppe `window.fetch` une seule fois, dès que le client
 * Supabase est chargé — ce qui n'arrive que pour un admin connecté.
 */

/** Routes publiques qui n'ont jamais besoin du jeton admin. */
const PUBLIC_PREFIXES = ['/api/client/', '/api/analytics/collect', '/api/contact'];

let installed = false;

export function installAdminFetchAuth(getToken: () => Promise<string | null>) {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.href);
      const isApi = url.origin === window.location.origin
        && url.pathname.startsWith('/api/')
        && !PUBLIC_PREFIXES.some((p) => url.pathname.startsWith(p));
      if (isApi) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has('authorization')) {
          const token = await getToken();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
            if (input instanceof Request) return originalFetch(new Request(input, { ...init, headers }));
            return originalFetch(input, { ...init, headers });
          }
        }
      }
    } catch {
      // En cas de doute, l'appel part tel quel
    }
    return originalFetch(input, init);
  };
}
