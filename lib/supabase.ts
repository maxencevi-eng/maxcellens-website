// lib/supabase.ts
//
// Client Supabase du navigateur, chargé à la demande.
//
// Le site n'utilise Supabase côté client que pour la session admin
// (getUser, getSession, onAuthStateChange, connexion / déconnexion). Importer
// `@supabase/supabase-js` directement faisait télécharger ~500 Ko de JS à
// chaque visiteur. Cette façade expose la même API `supabase.auth.*` mais ne
// charge la vraie bibliothèque que si une session est stockée dans le
// navigateur (ou au moment de se connecter) : un visiteur ne la télécharge
// jamais.
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { installAdminFetchAuth } from './adminFetchAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.local.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/** Clé localStorage de la session (format par défaut de supabase-js v2). */
const STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

type Auth = SupabaseClient['auth'];
type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

let clientPromise: Promise<SupabaseClient> | null = null;
let loaded = false;
const listeners = new Set<AuthListener>();

/** Vrai si une session admin est mémorisée dans ce navigateur. */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage inaccessible : on ne peut pas savoir, on charge le client
    return true;
  }
}

function loadClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      const client = createClient(supabaseUrl!, supabaseAnonKey!);
      loaded = true;
      client.auth.onAuthStateChange((event, session) => {
        listeners.forEach((cb) => {
          try { cb(event, session); } catch (e) { console.error(e); }
        });
      });
      installAdminFetchAuth(async () => (await client.auth.getSession()).data.session?.access_token ?? null);
      return client;
    });
  }
  return clientPromise;
}

// Connexion depuis un autre onglet : on charge le client pour suivre la session.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue && !loaded) loadClient();
  });
  if (hasStoredSession()) loadClient();
}

/** Client complet (temps réel, etc.), chargé à la demande pour les rares écrans qui en ont besoin. */
export function getSupabaseClient(): Promise<SupabaseClient> {
  return loadClient();
}

const needsClient = () => loaded || hasStoredSession();

const auth = {
  async getUser(...args: Parameters<Auth['getUser']>): ReturnType<Auth['getUser']> {
    if (!needsClient()) return { data: { user: null }, error: null } as any;
    return (await loadClient()).auth.getUser(...args);
  },
  async getSession(): ReturnType<Auth['getSession']> {
    if (!needsClient()) return { data: { session: null }, error: null } as any;
    return (await loadClient()).auth.getSession();
  },
  onAuthStateChange(cb: AuthListener) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => { listeners.delete(cb); } } } };
  },
  async signInWithPassword(...args: Parameters<Auth['signInWithPassword']>): ReturnType<Auth['signInWithPassword']> {
    return (await loadClient()).auth.signInWithPassword(...args);
  },
  async signOut(...args: Parameters<Auth['signOut']>): ReturnType<Auth['signOut']> {
    if (!needsClient()) return { error: null };
    return (await loadClient()).auth.signOut(...args);
  },
};

export const supabase = { auth };
export default supabase;
