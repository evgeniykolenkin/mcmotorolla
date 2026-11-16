import { computed, ref } from 'vue'

const STORAGE_KEY = 'mcmotorolla.theme.v1'
const theme = ref('dark')

function paint(value) {
  document.documentElement.classList.toggle('p-dark', value === 'dark')
}

/** Вызывается один раз в main.js до монтирования приложения. */
export function applyInitialTheme() {
  let saved = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }

  theme.value = saved === 'light' ? 'light' : 'dark'
  paint(theme.value)
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function setTheme(value) {
    theme.value = value === 'light' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      /* приватный режим — просто не запоминаем */
    }
    paint(theme.value)
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { theme, isDark, setTheme, toggleTheme }
}
