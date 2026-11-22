import { isSupabaseConfigured } from './supabaseClient'
import * as supabaseCommentsRepo from './supabaseCommentsRepo'

/**
 * Фасад комментариев.
 *
 * Комментарии работают только с Supabase: в локальном режиме их нет, потому
 * что гостевые сообщения должны быть видны всем посетителям и модерироваться
 * владельцем. Компоненты проверяют commentsAvailable и не показывают раздел
 * в локальном режиме.
 */
export const commentsAvailable = isSupabaseConfigured

export const commentsRepository = isSupabaseConfigured ? supabaseCommentsRepo : null
