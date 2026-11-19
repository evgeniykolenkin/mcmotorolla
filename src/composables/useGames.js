import { computed, ref } from 'vue'
import { gamesRepository } from '../services/gamesRepository'

const ALL_PLATFORMS = 'all'
const ALL_STATUSES = 'all'

const games = ref([])
const loading = ref(false)
const loaded = ref(false)
const error = ref(null)

const search = ref('')
const sortBy = ref('recent')
// Фильтр платформ временно скрыт на главной (см. GamesToolbar), но логика жива
const platform = ref(ALL_PLATFORMS)
const statusFilter = ref(ALL_STATUSES)

const sorters = {
  recent: (a, b) => String(b.completedAt).localeCompare(String(a.completedAt)),
  rating: (a, b) => b.rating - a.rating || String(b.completedAt).localeCompare(String(a.completedAt)),
  title: (a, b) => a.title.localeCompare(b.title, 'ru')
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    games.value = await gamesRepository.list()
    loaded.value = true
  } catch (err) {
    error.value = err?.message ?? 'Не удалось загрузить игры'
  } finally {
    loading.value = false
  }
}

function ensureLoaded() {
  if (!loaded.value && !loading.value) refresh()
}

const platforms = computed(() => {
  const unique = new Set(games.value.map((game) => game.platform).filter(Boolean))
  return [...unique].sort((a, b) => a.localeCompare(b, 'ru'))
})

const publishedGames = computed(() => games.value.filter((game) => game.published))

const filteredGames = computed(() => {
  const query = search.value.trim().toLowerCase()

  return publishedGames.value
    .filter((game) => {
      if (platform.value !== ALL_PLATFORMS && game.platform !== platform.value) return false
      // Старые записи без статуса считаем пройденными (как дефолт в базе)
      if (statusFilter.value !== ALL_STATUSES && (game.status || 'completed') !== statusFilter.value) {
        return false
      }
      if (!query) return true

      return [game.title, game.genre, game.verdict, game.review]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    })
    .sort(sorters[sortBy.value] ?? sorters.recent)
})

const allGames = computed(() =>
  [...games.value].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
)

const stats = computed(() => {
  const items = publishedGames.value
  const count = items.length
  const hours = items.reduce((sum, game) => sum + (Number(game.hours) || 0), 0)
  const average = count
    ? items.reduce((sum, game) => sum + (Number(game.rating) || 0), 0) / count
    : 0

  return {
    count,
    hours: Math.round(hours),
    average: count ? average.toFixed(1).replace('.', ',') : '—'
  }
})

function resetFilters() {
  search.value = ''
  platform.value = ALL_PLATFORMS
  statusFilter.value = ALL_STATUSES
  sortBy.value = 'recent'
}

function findGameBySlug(slug) {
  return games.value.find((game) => game.slug === slug) ?? null
}

async function saveGame(payload) {
  const saved = payload.id
    ? await gamesRepository.update(payload.id, payload)
    : await gamesRepository.create(payload)

  const index = games.value.findIndex((game) => game.id === saved.id)
  if (index === -1) games.value.push(saved)
  else games.value[index] = saved

  return saved
}

async function deleteGame(id) {
  await gamesRepository.remove(id)
  games.value = games.value.filter((game) => game.id !== id)
}

export function useGames() {
  return {
    ALL_PLATFORMS,
    ALL_STATUSES,
    games,
    loading,
    loaded,
    error,
    search,
    sortBy,
    platform,
    platforms,
    statusFilter,
    filteredGames,
    allGames,
    stats,
    refresh,
    ensureLoaded,
    resetFilters,
    findGameBySlug,
    saveGame,
    deleteGame
  }
}
