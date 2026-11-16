import { computed, ref } from 'vue'
import { demoOwnerPassword, ownerEmail as defaultOwnerEmail } from '../config/site'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'

/**
 * Авторизация владельца.
 *
 * В режиме Supabase (этап 1) — настоящий вход через Supabase Auth:
 * email + пароль пользователя, созданного в Authentication → Users.
 * В локальном режиме (этап 0) — заглушка со сравнением пароля на клиенте.
 *
 * Интерфейс для компонентов один: isOwner / signIn / signOut.
 */
const STORAGE_KEY = 'mcmotorolla.owner.v1'

function readLocalSession() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ok'
  } catch {
    return false
  }
}

const isOwner = ref(isSupabaseConfigured ? false : readLocalSession())
let initialized = false

function applySession(session) {
  isOwner.value = Boolean(session?.user)
}

function translateAuthError(error) {
  const message = String(error?.message ?? '')

  if (/Invalid login credentials/i.test(message)) return 'Неверный email или пароль'
  if (/Email not confirmed/i.test(message)) {
    return 'Email не подтверждён: включите Auto Confirm User у пользователя в Supabase'
  }
  if (/Email logins are disabled/i.test(message)) {
    return 'Вход по email выключен в Supabase → Authentication → Providers'
  }
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток, попробуйте позже'
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Нет связи с Supabase — проверьте интернет'
  }

  return message || 'Не удалось войти'
}

/** Восстановление сессии Supabase — вызывается один раз в main.js. */
export async function initAuth() {
  if (!isSupabaseConfigured || initialized) return
  initialized = true

  const { data } = await supabase.auth.getSession()
  applySession(data?.session)

  supabase.auth.onAuthStateChange((_event, session) => applySession(session))
}

export function useAuth() {
  const signedIn = computed(() => isOwner.value)

  async function signIn({ email, password } = {}) {
    if (isSupabaseConfigured) {
      const mail = String(email ?? defaultOwnerEmail ?? '').trim()
      if (!mail) return { ok: false, message: 'Укажите email владельца' }

      const { error } = await supabase.auth.signInWithPassword({
        email: mail,
        password: String(password ?? '')
      })

      if (error) return { ok: false, message: translateAuthError(error) }

      isOwner.value = true
      return { ok: true }
    }

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

  async function signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* игнорируем */
    }

    isOwner.value = false
  }

  return { isOwner: signedIn, signIn, signOut }
}
