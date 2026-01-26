import { supabase } from './supabase';
import type { Project } from '../types';

export async function fetchProjects(): Promise<Project[]> {
  // Avoid relying on a `published_at` column which may not exist in the user's schema.
  try {
    const { data, error } = await supabase.from('projects').select('*').limit(100);
    if (error) {
      // Build a detailed, non-enumerable-safe snapshot of the error object
      let snapshot: any = {};
      try {
        Object.getOwnPropertyNames(error).forEach((k) => (snapshot[k] = (error as any)[k]));
      } catch (_) {
        snapshot = String(error);
      }

      console.error('Supabase fetchProjects error', snapshot);
      return [];
    }
    return (data as unknown as Project[]) || [];
  } catch (err) {
    console.error('Supabase fetchProjects thrown error', err);
    return [];
  }
}

export async function fetchProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase.from('projects').select('*').eq('slug', slug).single();
    if (error) {
      let snapshot: any = {};
      try {
        Object.getOwnPropertyNames(error).forEach((k) => (snapshot[k] = (error as any)[k]));
      } catch (_) {
        snapshot = String(error);
      }
      console.error('Supabase fetchProjectBySlug error', snapshot);
      return null;
    }
    return (data as unknown as Project) || null;
  } catch (err) {
    console.error('Supabase fetchProjectBySlug thrown error', err);
    return null;
  }
}
