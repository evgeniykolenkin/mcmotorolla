import { uniqueSlug } from '../utils/slugify'

const STORAGE_KEY = 'mcmotorolla.games.v1'
const LATENCY_MS = 160

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

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

function writeStore(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* битые данные в localStorage — начинаем с пустого дневника */
  }

  return []
}

function normalize(payload, previous = {}, games) {
  const now = new Date().toISOString()
  const title = toText(payload.title)

  return {
    id: previous.id ?? crypto.randomUUID(),
    title,
    // slug не меняем при редактировании — ссылки на игру остаются живыми
    slug: previous.slug ?? uniqueSlug(title, games),
    coverUrl: toText(payload.coverUrl) || null,
    platform: payload.platform || 'ПК',
    genre: toText(payload.genre),
    rating: Number(payload.rating),
    hours:
      payload.hours === null || payload.hours === '' || payload.hours === undefined
        ? null
        : Number(payload.hours),
    completedAt: payload.completedAt || null,
    verdict: toText(payload.verdict),
    review: toText(payload.review),
    status: payload.status ?? 'completed',
    published: payload.published !== false,
    releaseYear: toYear(payload.releaseYear),
    steamAppId: toAppId(payload.steamAppId),
    createdAt: previous.createdAt ?? now,
    updatedAt: now
  }
}

/** Сначала игры с датой, без даты — в конце; при равенстве — свежие правки выше. */
function compareByCompletionDesc(a, b) {
  const byDate = String(b.completedAt || '').localeCompare(String(a.completedAt || ''))
  if (byDate) return byDate

  return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
}

export async function list() {
  await wait()
  return readStore().sort(compareByCompletionDesc)
}

export async function getBySlug(slug) {
  await wait()
  return readStore().find((game) => game.slug === slug) ?? null
}

export async function create(payload) {
  await wait()
  const games = readStore()
  const created = normalize(payload, {}, games)
  games.push(created)
  writeStore(games)
  return created
}

export async function update(id, payload) {
  await wait()
  const games = readStore()
  const index = games.findIndex((game) => game.id === id)
  if (index === -1) throw new Error('Игра не найдена')

  const updated = normalize({ ...games[index], ...payload, id }, games[index], games)
  games[index] = updated
  writeStore(games)
  return updated
}

export async function remove(id) {
  await wait()
  const games = readStore().filter((game) => game.id !== id)
  writeStore(games)
}
