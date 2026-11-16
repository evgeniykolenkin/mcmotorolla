import { computed, ref } from 'vue'
import { demoOwnerPassword } from '../config/site'

/**
 * ЭТАП 0 — ЗАГЛУШКА АВТОРИЗАЦИИ.
 * Проверка пароля происходит на клиенте, это НЕ безопасность: так сделано,
 * чтобы можно было пощупать интерфейс без бэкенда.
 * Этап 2 заменит содержимое этого файла на supabase.auth (интерфейс останется тем же).
 */
const STORAGE_KEY = 'mcmotorolla.owner.v1'

function readSession() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ok'
  } catch {
    return false
  }
}

const isOwner = ref(readSession())

export function useAuth() {
  const signedIn = computed(() => isOwner.value)

  function signIn(password) {
    if (String(password) === String(demoOwnerPassword)) {
      try {
        localStorage.setItem(STORAGE_KEY, 'ok')
      } catch {
        /* игнорируем */
      }
      isOwner.value = true
      return { ok: true }
    }

    return { ok: false, message: 'Неверный пароль' }
  }

  function signOut() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* игнорируем */
    }
    isOwner.value = false
  }

  return { isOwner: signedIn, signIn, signOut }
}
