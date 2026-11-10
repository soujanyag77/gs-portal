import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from './config';

/**
 * Creates a browser-safe Supabase client using @supabase/ssr
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

/**
 * Direct Supabase JS client instance for client-side storage & table interactions
 */
export const supabase = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey());

export { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey };
