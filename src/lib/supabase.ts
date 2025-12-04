import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: log config to help diagnose production issues
console.log('[Supabase Config]', {
  url: supabaseUrl,
  anonKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...${supabaseAnonKey.slice(-10)}` : 'MISSING',
  anonKeyLength: supabaseAnonKey?.length ?? 0,
})

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storageKey: 'avatarz-auth',
      storage: localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
