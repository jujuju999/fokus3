import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * False until both values are set in .env.local. App.tsx gates on this and
 * shows a setup notice instead of a white screen when configuration is missing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | undefined

/** Only call from code paths behind the isSupabaseConfigured gate in App.tsx. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase ist nicht konfiguriert – VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local setzen.')
    }
    client = createClient(url, anonKey)
  }
  return client
}
