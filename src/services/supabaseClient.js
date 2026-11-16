import { createClient } from '@supabase/supabase-js'

/**
 * Клиент Supabase.
 *
 * Ключ — publishable (`sb_publishable_...`, он же anon JWT в старых проектах).
 * Он публичный: доступ к данным ограничивают RLS-политики таблицы `public.games`.
 * Секретный ключ (`sb_secret_...` / service_role) в браузерном коде не используется.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  : null
