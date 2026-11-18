const STORAGE_KEY = 'mcmotorolla.site.v1'
const LATENCY_MS = 120

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Настройки сайта в localStorage — для локального режима без Supabase.
 * Набор методов тот же, что у supabaseSettingsRepo.
 */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {
    /* битые данные — начинаем с дефолтов */
  }

  return {}
}

function writeStore(values) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
}

export async function list() {
  await wait()
  return readStore()
}

export async function save(patch) {
  await wait()
  const store = readStore()

  for (const [key, value] of Object.entries(patch)) {
    store[key] = value ?? ''
  }

  writeStore(store)
  return { ...patch }
}

export async function remove(keys) {
  await wait()
  const store = readStore()

  for (const key of Array.isArray(keys) ? keys : [keys]) {
    delete store[key]
  }

  writeStore(store)
}
