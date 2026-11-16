/**
 * Тонкий клиент публичного Steam Store API.
 *
 * Используется и Vercel-функцией (api/steam.js), и dev-плагином Vite,
 * поэтому здесь нет ни req/res, ни зависимостей — только fetch.
 *
 * Эндпоинты Steam не отдают CORS-заголовки, поэтому браузер ходит не напрямую,
 * а через /api/steam (см. src/services/steamClient.js).
 */

const STORE_SEARCH_URL = 'https://store.steampowered.com/api/storesearch/'
const STORE_DETAILS_URL = 'https://store.steampowered.com/api/appdetails/'
const COVER_BASE = 'https://cdn.cloudflare.steamstatic.com/steam/apps'
const USER_AGENT = 'mcmotorolla-game-diary/1.0 (+https://mcmotorolla.vercel.app)'

/**
 * Регион магазина. Нужен обязательно (без cc storesearch возвращает пусто),
 * а RU-каталог не содержит часть игр — например, The Witcher 3 и Cyberpunk 2077
 * отдают success:false. Названия всё равно русские благодаря l=russian.
 */
const STORE_COUNTRY = 'US'

const REQUEST_TIMEOUT_MS = 6000
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 300

export class SteamError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'SteamError'
    this.status = status
  }
}

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

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...options,
      headers: { 'User-Agent': USER_AGENT, ...(options.headers ?? {}) },
      signal: controller.signal
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new SteamError('Steam не ответил вовремя — попробуйте ещё раз', 504)
    }
    throw new SteamError('Steam недоступен — проверьте интернет', 502)
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } })

  if (response.status === 429) {
    throw new SteamError('Steam ограничил частоту запросов — попробуйте через минуту', 429)
  }
  if (!response.ok) {
    throw new SteamError(`Steam ответил кодом ${response.status}`, 502)
  }

  try {
    return await response.json()
  } catch {
    throw new SteamError('Steam вернул неожиданный ответ', 502)
  }
}

/** HEAD-проверка картинки: есть ли вертикальная обложка 600×900. */
async function imageExists(url) {
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD' })
    return response.ok && /^image\//i.test(response.headers.get('content-type') ?? '')
  } catch {
    return false
  }
}

/**
 * Обложка 600×900 (почти 3:4 — как в карточках дневника).
 * Если Steam не отдал портретную версию — берём горизонтальный header.
 */
async function resolveCover(appId, fallbackUrl) {
  const key = `cover:${appId}`
  const cached = cacheGet(key)
  if (cached !== undefined) return cached

  const portrait = `${COVER_BASE}/${appId}/library_600x900.jpg`
  const cover = (await imageExists(portrait)) ? portrait : fallbackUrl || ''
  cacheSet(key, cover)
  return cover
}

/** «21 фев. 2022 г.» / «21 Feb, 2022» / «2022» → 2022 */
function parseYear(value) {
  const match = String(value ?? '').match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : null
}

function parseMetacritic(data) {
  const score = Number(data?.metacritic?.score)
  return Number.isFinite(score) && score > 0 ? Math.trunc(score) : null
}

/**
 * Поиск игр в магазине Steam.
 * @returns {{ appId: number, name: string, image: string, metacritic: number|null }[]}
 */
export async function searchSteamGames(query, { limit = 7 } = {}) {
  const term = String(query ?? '').trim()
  if (term.length < 2) return []

  const key = `search:${term.toLowerCase()}`
  const cached = cacheGet(key)
  if (cached) return cached

  const url = new URL(STORE_SEARCH_URL)
  url.searchParams.set('term', term)
  url.searchParams.set('l', 'russian')
  url.searchParams.set('cc', STORE_COUNTRY)

  const payload = await fetchJson(url.toString())
  const items = Array.isArray(payload?.items) ? payload.items : []

  const results = items
    .filter((item) => item?.type === 'app' && Number(item?.id) > 0 && item?.name)
    .slice(0, limit)
    .map((item) => ({
      appId: Number(item.id),
      name: String(item.name).trim(),
      image: String(item.tiny_image ?? ''),
      metacritic: Number.isFinite(Number(item.metascore)) && Number(item.metascore) > 0
        ? Math.trunc(Number(item.metascore))
        : null
    }))

  cacheSet(key, results)
  return results
}

/**
 * Детали игры по appid: название, обложка, жанры, год выхода.
 * Описание (short_description) намеренно не берём — его пишет владелец дневника.
 */
export async function getSteamGame(appId) {
  const id = Number(appId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new SteamError('Некорректный Steam appid', 400)
  }

  const key = `game:${id}`
  const cached = cacheGet(key)
  if (cached) return cached

  const url = new URL(STORE_DETAILS_URL)
  url.searchParams.set('appids', String(id))
  url.searchParams.set('l', 'russian')
  url.searchParams.set('cc', STORE_COUNTRY)

  const payload = await fetchJson(url.toString())
  const entry = payload?.[String(id)]

  if (!entry?.success || !entry?.data) {
    throw new SteamError('Игра не найдена в Steam', 404)
  }

  const data = entry.data
  const genres = Array.isArray(data.genres)
    ? data.genres.map((genre) => String(genre?.description ?? '').trim()).filter(Boolean)
    : []

  const game = {
    appId: id,
    title: String(data.name ?? '').trim(),
    coverUrl: await resolveCover(id, data.header_image),
    genre: genres.join(', '),
    releaseYear: parseYear(data.release_date?.date),
    metacritic: parseMetacritic(data),
    storeUrl: `https://store.steampowered.com/app/${id}/`
  }

  cacheSet(key, game)
  return game
}
