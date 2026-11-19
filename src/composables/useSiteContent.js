import { computed, ref } from 'vue'
import { applyOverrides, defaultFor } from '../config/content'
import { settingsRepository } from '../services/settingsRepository'

/**
 * Тексты шапки и главной секции + картинки (аватар, фон).
 *
 * Дефолты живут в src/config/content.js, правки — в public.site_settings.
 * Пока настройки не загрузились или база недоступна, показываются дефолты,
 * поэтому сайт никогда не остаётся с пустыми заголовками.
 *
 * Состояние модульное: все компоненты видят одни и те же значения.
 */
const overrides = ref({})
const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
const error = ref('')

const content = computed(() => applyOverrides(overrides.value))

/**
 * Первая загрузка ещё идёт — компоненты показывают скелетоны, чтобы не мигал
 * текст дефолтов. Если база ответила ошибкой, `loaded` остаётся false, но
 * `error` заполнен: скелетон снимается и сразу видны дефолты.
 */
const pending = computed(() => !loaded.value && !error.value)

async function reload() {
  if (loading.value) return

  loading.value = true
  error.value = ''

  try {
    overrides.value = await settingsRepository.list()
    loaded.value = true
  } catch (err) {
    error.value = err?.message ?? 'Не удалось загрузить настройки'
  } finally {
    loading.value = false
  }
}

function ensureLoaded() {
  if (loaded.value || loading.value) return Promise.resolve()
  return reload()
}

/**
 * Сохраняет только переданные ключи: строки обрезаются по краям,
 * массивы (добавленные кнопки в hero) уходят в базу как JSON.
 */
async function save(patch) {
  const cleaned = {}

  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      cleaned[key] = JSON.stringify(value)
    } else {
      cleaned[key] = value === null || value === undefined ? '' : String(value).trim()
    }
  }
  if (!Object.keys(cleaned).length) return {}

  saving.value = true
  try {
    const saved = await settingsRepository.save(cleaned)
    overrides.value = { ...overrides.value, ...saved }
    return saved
  } finally {
    saving.value = false
  }
}

/** Удаляет правку — ключ снова показывает дефолт из кода. */
async function reset(keys) {
  const list = Array.isArray(keys) ? keys : [keys]

  saving.value = true
  try {
    await settingsRepository.remove(list)
    const next = { ...overrides.value }
    for (const key of list) delete next[key]
    overrides.value = next
  } finally {
    saving.value = false
  }
}

export function useSiteContent() {
  return {
    content,
    overrides,
    loading,
    loaded,
    pending,
    saving,
    error,
    ensureLoaded,
    reload,
    save,
    reset,
    defaultFor
  }
}
