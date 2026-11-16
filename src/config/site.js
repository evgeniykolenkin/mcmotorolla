import { isSupabaseConfigured } from '../services/supabaseClient'

/**
 * Всё «брендирование» сайта в одном месте.
 * Меняешь ник или ссылку на Twitch/Telegram — правишь только этот файл.
 */
export const site = {
  nickname: 'mcmotorolla',
  title: 'mcmotorolla — игры, которые я прошёл',
  tagline: 'Игры, которые я прошёл',
  subtitle:
    'Честный дневник: оценка от 1 до 10, сколько часов заняло и как это было. Без спойлеров там, где можно без них.',
  twitchUrl: 'https://www.twitch.tv/mcmotorolla',
  telegramUrl: 'https://t.me/mcmotoroller',
  year: new Date().getFullYear()
}

/**
 * Площадки стримера. Из этого списка строятся иконки в шапке и ссылки в подвале,
 * поэтому новую площадку достаточно дописать здесь.
 * Пустой url — площадка просто не показывается.
 */
export const socials = [
  {
    key: 'twitch',
    label: 'Twitch',
    title: 'Канал на Twitch',
    icon: 'pi pi-twitch',
    url: site.twitchUrl
  },
  {
    key: 'telegram',
    label: 'Telegram',
    title: 'Телеграм-канал',
    icon: 'pi pi-telegram',
    url: site.telegramUrl
  }
].filter((social) => Boolean(social.url))

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
