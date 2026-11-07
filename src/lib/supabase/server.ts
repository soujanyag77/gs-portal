import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component.
          // Handled by middleware refreshing user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        } catch (error) {
          // The `delete` method was called from a Server Component.
        }
      },
    },
  });
}

/**
 * Service Role or Administrative Supabase client for authenticated server routes.
 * Bypasses RLS when SUPABASE_SERVICE_ROLE_KEY is provided, or falls back to anon key.
 */
export function createServerSupabaseAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    getSupabaseAnonKey();

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

