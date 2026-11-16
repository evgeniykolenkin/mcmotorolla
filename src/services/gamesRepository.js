import * as localGamesRepo from './localGamesRepo'

/**
 * Фасад над источником данных — компоненты не знают, откуда берутся игры.
 *
 * ЭТАП 0: данные в localStorage (localGamesRepo).
 * ЭТАП 1: добавить ./supabaseGamesRepo.js и переключение:
 *
 *   export const gamesRepository = isSupabaseConfigured
 *     ? supabaseGamesRepo
 *     : localGamesRepo
 *
 * Набор методов у обоих репозиториев одинаковый:
 * list / getBySlug / create / update / remove.
 */
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const backendMode = 'local'

export const gamesRepository = localGamesRepo
