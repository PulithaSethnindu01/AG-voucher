import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast and loudly in development; the app cannot function without
  // a Supabase connection. Never fall back to hardcoded credentials.
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in your .env file (see .env.example).',
  )
}

/**
 * Singleton Supabase client for the browser.
 *
 * Uses only the public anon key - RLS policies and secure RPC functions on
 * the database are the real authorization boundary. The service-role key is
 * NEVER used here and must never be shipped to the frontend.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
