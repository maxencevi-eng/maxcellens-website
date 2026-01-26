// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasPublicSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasPublicSupabaseEnv) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — public supabase client will be disabled.');
}

export const supabase = hasPublicSupabaseEnv ? createClient(supabaseUrl as string, supabaseAnonKey as string) : (null as any);
export default supabase;
