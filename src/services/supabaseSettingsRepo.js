import { supabase } from './supabaseClient'

const TABLE = 'site_settings'

/**
 * Редактируемые тексты сайта в Postgres (Supabase).
 * Хранится одна строка на поле: key = 'hero.title', value = текст.
 */

function toError(error) {
  const message = String(error?.message ?? '')

  if (/row-level security/i.test(message)) {
    return new Error('Нет прав на изменение: войдите как владелец')
  }
  if (/relation .* does not exist|Could not find the table|schema cache/i.test(message)) {
    return new Error(
      'В Supabase нет таблицы настроек — выполните supabase/0003_site_settings_and_media.sql'
    )
  }
  if (/JWT|token is expired|session/i.test(message)) {
    return new Error('Сессия истекла — войдите заново')
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return new Error('Нет связи с Supabase — проверьте интернет')
  }

  return new Error(message || 'Ошибка Supabase')
}

/** Плоский объект { 'hero.title': '…' } — удобно мержить с дефолтами. */
export async function list() {
  const { data, error } = await supabase.from(TABLE).select('key, value')

  if (error) throw toError(error)
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value ?? '']))
}

export async function save(patch) {
  const rows = Object.entries(patch).map(([key, value]) => ({ key, value: value ?? '' }))
  if (!rows.length) return {}

  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'key' })
  if (error) throw toError(error)

  return Object.fromEntries(rows.map((row) => [row.key, row.value]))
}

/** Удаление правок — чтобы ключ снова показывал дефолт из кода. */
export async function remove(keys) {
  const list = Array.isArray(keys) ? keys : [keys]
  if (!list.length) return

  const { error } = await supabase.from(TABLE).delete().in('key', list)
  if (error) throw toError(error)
}
