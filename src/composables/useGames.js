import { computed, ref } from 'vue'
import { gamesRepository } from '../services/gamesRepository'
import { STATUS_OPTIONS } from '../utils/format'

const ALL_PLATFORMS = 'all'

/**
 * Порядок статусов для сортировки «По прохождению»: пройдена → прохожу → брошена.
 * Берём из STATUS_OPTIONS, чтобы порядок в селекте формы и в сортировке не разъезжался.
 */
const STATUS_ORDER = Object.fromEntries(
  STATUS_OPTIONS.map((option, index) => [option.value, index])
)
const STATUS_FALLBACK = STATUS_OPTIONS.length

const games = ref([])
const loading = ref(false)
const loaded = ref(false)
const error = ref(null)

const search = ref('')
const sortBy = ref('recent')
// Фильтр платформ временно скрыт на главной (см. GamesToolbar), но логика жива
const platform = ref(ALL_PLATFORMS)

/** Старые записи без статуса считаем пройденными (как дефолт в базе). */
function statusRank(game) {
  return STATUS_ORDER[game.status || 'completed'] ?? STATUS_FALLBACK
}

const sorters = {
  recent: (a, b) => String(b.completedAt).localeCompare(String(a.completedAt)),
  rating: (a, b) => b.rating - a.rating || String(b.completedAt).localeCompare(String(a.completedAt)),
  title: (a, b) => a.title.localeCompare(b.title, 'ru'),
  // Группы по статусу, внутри группы — как в «Сначала новые»
  status: (a, b) =>
    statusRank(a) - statusRank(b) || String(b.completedAt).localeCompare(String(a.completedAt))
}

// Номер последнего запроса: ответы, пришедшие после более свежего, игнорируем —
// иначе медленный анонимный список мог перетереть список, загруженный после входа.
let requestId = 0

async function refresh() {
  const id = ++requestId
  loading.value = true
  error.value = null
  try {
    const items = await gamesRepository.list()

    // Пока запрос летел, мог начаться новый (например, вход в аккаунт).
    if (id !== requestId) return

    games.value = items
    loaded.value = true
  } catch (err) {
    if (id !== requestId) return
    error.value = err?.message ?? 'Не удалось загрузить игры'
  } finally {
    if (id === requestId) loading.value = false
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
      if (!query) return true

      return [game.title, game.genre, game.verdict]
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
  // count — все опубликованные игры: на главной это «Всего игр», в админке «опубликовано»
  const count = items.length
  // Старые записи без статуса считаем пройденными — как в statusRank/statusTone
  const completed = items.filter((game) => (game.status || 'completed') === 'completed').length
  const hours = items.reduce((sum, game) => sum + (Number(game.hours) || 0), 0)
  const average = count
    ? items.reduce((sum, game) => sum + (Number(game.rating) || 0), 0) / count
    : 0

  return {
    count,
    completed,
    hours: Math.round(hours),
    average: count ? average.toFixed(1).replace('.', ',') : '—'
  }
})

function resetFilters() {
  search.value = ''
  platform.value = ALL_PLATFORMS
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
    games,
    loading,
    loaded,
    error,
    search,
    sortBy,
    platform,
    platforms,
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
