// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasPublicSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasPublicSupabaseEnv) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — public supabase client will be disabled.');
}

function makeNoopSupabaseClient() {
  const noop = async () => ({ data: null, error: null });
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      signInWithPassword: async (_creds: any) => ({ data: null, error: new Error('Supabase client not configured') }),
      signOut: async () => ({ data: null, error: null })
    }
  } as any;
}

export const supabase = hasPublicSupabaseEnv ? createClient(supabaseUrl as string, supabaseAnonKey as string) : makeNoopSupabaseClient();
export default supabase;
