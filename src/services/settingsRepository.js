import { isSupabaseConfigured } from './supabaseClient'
import * as localSettingsRepo from './localSettingsRepo'
import * as supabaseSettingsRepo from './supabaseSettingsRepo'

/**
 * Фасад над источником настроек — как gamesRepository, но для текстов и картинок.
 *
 * Локальный режим: localStorage (localSettingsRepo).
 * Supabase:        таблица public.site_settings (supabaseSettingsRepo).
 *
 * Методы одинаковые: list / save / remove.
 */
export const settingsRepository = isSupabaseConfigured ? supabaseSettingsRepo : localSettingsRepo
