import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { getSteamGame, searchSteamGames, SteamError } from './api/_steamClient.js'

/**
 * В `npm run dev` Vercel-функции не запускаются, поэтому /api/steam
 * обслуживает этот middleware — через тот же клиент api/_steamClient.js.
 */
function steamDevApi() {
  return {
    name: 'steam-dev-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url ?? ''
        if (!requestUrl.startsWith('/api/steam')) {
          next()
          return
        }

        const url = new URL(requestUrl, 'http://localhost')
        const action = url.searchParams.get('action')

        const send = (status, payload) => {
          response.statusCode = status
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify(payload))
        }

        try {
          if (action === 'search') {
            const query = (url.searchParams.get('q') ?? '').trim()
            if (query.length < 2) {
              send(400, { error: 'Введите минимум 2 символа' })
              return
            }
            send(200, { results: await searchSteamGames(query) })
            return
          }

          if (action === 'game') {
            send(200, { game: await getSteamGame(url.searchParams.get('appid')) })
            return
          }

          send(400, { error: 'Неизвестное действие: ожидается search или game' })
        } catch (error) {
          const status = error instanceof SteamError ? error.status : 502
          send(status, { error: error?.message ?? 'Steam недоступен' })
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), steamDevApi()],
  build: {
    rollupOptions: {
      output: {
        // Supabase тянет заметный кусок — выносим его отдельным чанком,
        // чтобы кэшировался независимо от кода приложения.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          vue: ['vue', 'vue-router']
        }
      }
    }
  }
})
