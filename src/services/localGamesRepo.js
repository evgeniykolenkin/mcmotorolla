import { demoGames } from '../data/demoGames'
import { uniqueSlug } from '../utils/slugify'

const STORAGE_KEY = 'mcmotorolla.games.v1'
const LATENCY_MS = 160

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (value) => JSON.parse(JSON.stringify(value))

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
    /* битые данные — пересоздадим из демо-набора */
  }

  writeStore(demoGames)
  return clone(demoGames)
}

function normalize(payload, previous = {}, games) {
  const now = new Date().toISOString()
  const title = String(payload.title ?? '').trim()

  return {
    id: previous.id ?? crypto.randomUUID(),
    title,
    // slug не меняем при редактировании — ссылки на игру остаются живыми
    slug: previous.slug ?? uniqueSlug(title, games),
    coverUrl: String(payload.coverUrl ?? '').trim() || null,
    platform: payload.platform || 'ПК',
    genre: String(payload.genre ?? '').trim(),
    rating: Number(payload.rating),
    hours:
      payload.hours === null || payload.hours === '' || payload.hours === undefined
        ? null
        : Number(payload.hours),
    completedAt: payload.completedAt || new Date().toISOString().slice(0, 10),
    verdict: String(payload.verdict ?? '').trim(),
    review: String(payload.review ?? '').trim(),
    status: payload.status ?? 'completed',
    published: payload.published !== false,
    createdAt: previous.createdAt ?? now,
    updatedAt: now
  }
}

export async function list() {
  await wait()
  return readStore().sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
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

/** Сброс демо-данных (кнопка в админке, этап 0). */
export async function resetToDemo() {
  await wait()
  writeStore(demoGames)
  return clone(demoGames)
}
