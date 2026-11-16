import { isSupabaseConfigured } from './supabaseClient'
import * as localGamesRepo from './localGamesRepo'
import * as supabaseGamesRepo from './supabaseGamesRepo'

/**
 * Фасад над источником данных — компоненты не знают, откуда берутся игры.
 *
 * Локальный режим: данные в localStorage (localGamesRepo) — включается,
 *                  когда VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не заданы.
 * Supabase:        данные в Postgres (supabaseGamesRepo) — включается сам,
 *                  как только заполнены VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.
 *
 * Набор методов у обоих репозиториев одинаковый: list / getBySlug / create / update / remove.
 */
export { isSupabaseConfigured }

export const backendMode = isSupabaseConfigured ? 'supabase' : 'local'

export const gamesRepository = isSupabaseConfigured ? supabaseGamesRepo : localGamesRepo
