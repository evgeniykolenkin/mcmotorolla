import { demoGames } from '../data/demoGames'
import { uniqueSlug } from '../utils/slugify'
import { supabase } from './supabaseClient'

const TABLE = 'games'

/**
 * ЭТАП 1: игры хранятся в Postgres (Supabase).
 * Набор методов и форма объектов — те же, что у localGamesRepo,
 * поэтому компоненты не знают, откуда пришли данные.
 */

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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** camelCase приложения → snake_case для БД (только переданные поля) */
function payloadToRow(payload) {
  const row = {}

  if (payload.title !== undefined) row.title = String(payload.title).trim()
  if (payload.coverUrl !== undefined) row.cover_url = String(payload.coverUrl).trim() || null
  if (payload.platform !== undefined) row.platform = payload.platform || 'ПК'
  if (payload.genre !== undefined) row.genre = String(payload.genre).trim()
  if (payload.rating !== undefined) row.rating = Number(payload.rating)
  if (payload.hours !== undefined) {
    row.hours =
      payload.hours === null || payload.hours === '' ? null : Number(payload.hours)
  }
  if (payload.completedAt !== undefined) {
    row.completed_at = payload.completedAt || new Date().toISOString().slice(0, 10)
  }
  if (payload.verdict !== undefined) row.verdict = String(payload.verdict).trim()
  if (payload.review !== undefined) row.review = String(payload.review).trim()
  if (payload.status !== undefined) row.status = payload.status
  if (payload.published !== undefined) row.published = payload.published !== false

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
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return new Error('Нет связи с Supabase — проверьте интернет')
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
    .order('completed_at', { ascending: false })

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

  const { data, error } = await supabase.from(TABLE).insert(row).select().single()
  if (error) throw toError(error)
  return rowToGame(data)
}

export async function update(id, payload) {
  // slug при редактировании не меняем — ссылки на игру остаются живыми
  const row = payloadToRow(payload)

  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw toError(error)
  if (!data) throw new Error('Игра не найдена или нет прав на изменение')
  return rowToGame(data)
}

export async function remove(id) {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id')

  if (error) throw toError(error)
  if (!data?.length) throw new Error('Игра не найдена или нет прав на удаление')
}

/**
 * «Вернуть демо-данные» в режиме Supabase: upsert 10 игр по slug
 * от имени вошедшего владельца (owner_id подставит default auth.uid()).
 */
export async function resetToDemo() {
  const rows = demoGames.map((game) => ({
    ...payloadToRow(game),
    slug: game.slug,
    completed_at: game.completedAt
  }))

  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'slug' })
  if (error) throw toError(error)

  return list()
}
