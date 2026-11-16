import { getSteamGame, searchSteamGames, SteamError } from './_steamClient.js'

/**
 * GET /api/steam?action=search&q=hades   → { results: [...] }
 * GET /api/steam?action=game&appid=1145360 → { game: {...} }
 *
 * Прокси нужен из-за отсутствия CORS у store.steampowered.com.
 * Ответы кешируются на CDN Vercel на неделю: данные Steam меняются редко.
 */
const SUCCESS_CACHE = 'public, s-maxage=604800, stale-while-revalidate=86400'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Cache-Control', 'no-store')
    response.status(405).json({ error: 'Поддерживается только GET' })
    return
  }

  const { action, q, appid } = request.query ?? {}

  try {
    if (action === 'search') {
      const query = String(q ?? '').trim()
      if (query.length < 2) {
        response.setHeader('Cache-Control', 'no-store')
        response.status(400).json({ error: 'Введите минимум 2 символа' })
        return
      }

      const results = await searchSteamGames(query)
      response.setHeader('Cache-Control', SUCCESS_CACHE)
      response.status(200).json({ results })
      return
    }

    if (action === 'game') {
      const game = await getSteamGame(appid)
      response.setHeader('Cache-Control', SUCCESS_CACHE)
      response.status(200).json({ game })
      return
    }

    response.setHeader('Cache-Control', 'no-store')
    response.status(400).json({ error: 'Неизвестное действие: ожидается search или game' })
  } catch (error) {
    const status = error instanceof SteamError ? error.status : 502
    response.setHeader('Cache-Control', 'no-store')
    response.status(status).json({ error: error?.message ?? 'Steam недоступен' })
  }
}
