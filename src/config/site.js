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
 * Локальный режим — Supabase не настроен, записи лежат в localStorage браузера.
 * Supabase — если в .env.local заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.
 */
export const isLocalBackend = !isSupabaseConfigured

/** Email владельца для входа (Supabase Auth). Если пусто — поле показывается в форме. */
export const ownerEmail = import.meta.env.VITE_OWNER_EMAIL ?? ''

/** Пароль локального режима — используется только пока Supabase не настроен. */
export const localOwnerPassword = import.meta.env.VITE_OWNER_PASSWORD ?? 'admin'
