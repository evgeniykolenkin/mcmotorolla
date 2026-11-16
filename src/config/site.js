import { isSupabaseConfigured } from '../services/supabaseClient'

/**
 * Всё «брендирование» сайта в одном месте.
 * Меняешь ник или ссылку на Twitch — правишь только этот файл.
 */
export const site = {
  nickname: 'mcmotorolla',
  title: 'mcmotorolla — игры, которые я прошёл',
  tagline: 'Игры, которые я прошёл',
  subtitle:
    'Честный дневник: оценка от 1 до 10, сколько часов заняло и как это было. Без спойлеров там, где можно без них.',
  twitchUrl: 'https://www.twitch.tv/mcmotorolla',
  year: new Date().getFullYear()
}

/**
 * Режим работы данных.
 * Этап 0 — данные лежат в localStorage браузера.
 * Этап 1 — Supabase, если в .env.local заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.
 */
export const isDemoBackend = !isSupabaseConfigured

/** Email владельца для входа (Supabase Auth). Если пусто — поле показывается в форме. */
export const ownerEmail = import.meta.env.VITE_OWNER_EMAIL ?? ''

/** Пароль заглушки этапа 0 — используется только пока Supabase не настроен. */
export const demoOwnerPassword = import.meta.env.VITE_OWNER_PASSWORD ?? 'admin'
