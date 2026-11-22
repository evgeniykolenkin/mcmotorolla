import { uniqueSlug } from '../utils/slugify'
import { supabase } from './supabaseClient'

const TABLE = 'games'

/**
 * Игры хранятся в Postgres (Supabase).
 * Набор методов и форма объектов — те же, что у localGamesRepo,
 * поэтому компоненты не знают, откуда пришли данные.
 */

/** null/undefined → '', остальное — строка без пробелов по краям */
function toText(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

/** Год выпуска из Steam: 1950–2100, иначе null */
function toYear(value) {
  const year = Number(value)
  return Number.isFinite(year) && year >= 1950 && year <= 2100 ? Math.trunc(year) : null
}

/** Steam appid: положительное целое, иначе null */
function toAppId(value) {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? Math.trunc(id) : null
}

/**
 * Миграция 0002 может быть ещё не применена (колонок release_year и steam_app_id нет).
 * Тогда повторяем запись без метаданных Steam, чтобы не блокировать сохранение игры.
 */
function isMissingColumn(error) {
  return /column .* does not exist/i.test(String(error?.message ?? ''))
}

function withoutMetaColumns(row) {
  const copy = { ...row }
  delete copy.release_year
  delete copy.steam_app_id
  return copy
}

/** snake_case из БД → camelCase приложения */
function rowToGame(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    coverUrl: row.cover_url,
    platform: row.platform,
    genre: row.genre,
    rating: Number(row.rating),
    hours: row.hours === null || row.hours === undefined ? null : Number(row.hours),
    completedAt: row.completed_at,
    verdict: row.verdict,
    review: row.review,
    status: row.status,
    published: row.published,
    releaseYear: toYear(row.release_year),
    steamAppId: toAppId(row.steam_app_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** camelCase приложения → snake_case для БД (только переданные поля) */
function payloadToRow(payload) {
  const row = {}

  if (payload.title !== undefined) row.title = toText(payload.title)
  if (payload.coverUrl !== undefined) row.cover_url = toText(payload.coverUrl) || null
  if (payload.platform !== undefined) row.platform = payload.platform || 'ПК'
  if (payload.genre !== undefined) row.genre = toText(payload.genre)
  if (payload.rating !== undefined) row.rating = Number(payload.rating)
  if (payload.hours !== undefined) {
    row.hours =
      payload.hours === null || payload.hours === '' ? null : Number(payload.hours)
  }
  if (payload.completedAt !== undefined) {
    row.completed_at = payload.completedAt || null
  }
  if (payload.verdict !== undefined) row.verdict = toText(payload.verdict)
  if (payload.review !== undefined) row.review = toText(payload.review)
  if (payload.status !== undefined) row.status = payload.status
  if (payload.published !== undefined) row.published = payload.published !== false
  if (payload.releaseYear !== undefined) row.release_year = toYear(payload.releaseYear)
  if (payload.steamAppId !== undefined) row.steam_app_id = toAppId(payload.steamAppId)

  return row
}

function toError(error) {
  const message = String(error?.message ?? '')

  if (/row-level security/i.test(message)) {
    return new Error('Нет прав на изменение: войдите как владелец')
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return new Error('Запись с таким адресом уже существует')
  }
  if (/JWT|token is expired|session/i.test(message)) {
    return new Error('Сессия истекла — войдите заново')
  }
  if (/null value in column "completed_at"/i.test(message)) {
    return new Error(
      'В Supabase не выполнена миграция даты — запустите supabase/0005_optional_completed_at.sql'
    )
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return new Error('Нет связи с Supabase — проверьте интернет')
  }
  if (/column .* does not exist/i.test(message)) {
    return new Error(
      'В Supabase не выполнена миграция полей — запустите supabase/0002_game_meta.sql'
    )
  }

  return new Error(message || 'Ошибка Supabase')
}

async function nextSlug(title) {
  const { data, error } = await supabase.from(TABLE).select('slug')
  if (error) throw toError(error)
  return uniqueSlug(title, data ?? [])
}

export async function list() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })

  if (error) throw toError(error)
  return (data ?? []).map(rowToGame)
}

export async function getBySlug(slug) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw toError(error)
  return data ? rowToGame(data) : null
}

export async function create(payload) {
  const row = payloadToRow(payload)
  row.slug = await nextSlug(row.title)

  let result = await supabase.from(TABLE).insert(row).select().single()

  if (result.error && isMissingColumn(result.error)) {
    result = await supabase.from(TABLE).insert(withoutMetaColumns(row)).select().single()
  }

  if (result.error) throw toError(result.error)
  return rowToGame(result.data)
}

export async function update(id, payload) {
  // slug при редактировании не меняем — ссылки на игру остаются живыми
  const row = payloadToRow(payload)

  let result = await supabase.from(TABLE).update(row).eq('id', id).select().maybeSingle()

  if (result.error && isMissingColumn(result.error)) {
    result = await supabase
      .from(TABLE)
      .update(withoutMetaColumns(row))
      .eq('id', id)
      .select()
      .maybeSingle()
  }

  if (result.error) throw toError(result.error)
  if (!result.data) throw new Error('Игра не найдена или нет прав на изменение')
  return rowToGame(result.data)
}

export async function remove(id) {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id')

  if (error) throw toError(error)
  if (!data?.length) throw new Error('Игра не найдена или нет прав на удаление')
}
