/**
 * Браузерный клиент автозаполнения из Steam.
 *
 * Ходит в свой прокси /api/steam (Vercel-функция в проде, middleware Vite в dev):
 * у store.steampowered.com нет CORS-заголовков, напрямую из браузера не вызвать.
 */

const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX_ENTRIES = 60
const REQUEST_TIMEOUT_MS = 15000

/** key → { value, expires } */
const cache = new Map()

function cacheGet(key) {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expires < Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
}

async function request(params, { signal } = {}) {
  const query = new URLSearchParams(params)
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    const response = await fetch(`/api/steam?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      /* ответ не JSON — обработаем по коду статуса */
    }

    if (!response.ok) {
      throw new Error(payload?.error ?? `Steam недоступен (код ${response.status})`)
    }

    return payload
  } catch (error) {
    if (timedOut) throw new Error('Steam не ответил — заполните поля вручную')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

/** Поиск игр. Возвращает [{ appId, name, image, metacritic }]. */
export async function searchSteamGames(query, options = {}) {
  const term = String(query ?? '').trim()
  if (term.length < 2) return []

  const key = `search:${term.toLowerCase()}`
  const cached = cacheGet(key)
  if (cached) return cached

  const payload = await request({ action: 'search', q: term }, options)
  const results = Array.isArray(payload?.results) ? payload.results : []
  cacheSet(key, results)
  return results
}

/** Детали игры: { appId, title, coverUrl, genre, releaseYear, metacritic, storeUrl }. */
export async function getSteamGame(appId, options = {}) {
  const id = Number(appId)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Некорректный Steam appid')

  const key = `game:${id}`
  const cached = cacheGet(key)
  if (cached) return cached

  const payload = await request({ action: 'game', appid: String(id) }, options)
  const game = payload?.game
  if (!game) throw new Error('Игра не найдена в Steam')

  cacheSet(key, game)
  return game
}
