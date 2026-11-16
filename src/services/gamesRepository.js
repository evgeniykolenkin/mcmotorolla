import { isSupabaseConfigured } from './supabaseClient'
import * as localGamesRepo from './localGamesRepo'
import * as supabaseGamesRepo from './supabaseGamesRepo'

/**
 * Фасад над источником данных — компоненты не знают, откуда берутся игры.
 *
 * ЭТАП 0: данные в localStorage (localGamesRepo).
 * ЭТАП 1: данные в Supabase (supabaseGamesRepo) — включается сам,
 *         как только заполнены VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.
 *
 * Набор методов у обоих репозиториев одинаковый:
 * list / getBySlug / create / update / remove / resetToDemo.
 */
export { isSupabaseConfigured }

export const backendMode = isSupabaseConfigured ? 'supabase' : 'local'

export const gamesRepository = isSupabaseConfigured ? supabaseGamesRepo : localGamesRepo

export const resetToDemo = gamesRepository.resetToDemo
