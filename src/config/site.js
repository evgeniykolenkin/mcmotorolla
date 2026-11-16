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
 * Этап 1 — подключим Supabase (см. src/services/gamesRepository.js).
 */
export const isDemoBackend = true

/** Пароль владельца для заглушки авторизации этапа 0 (НЕ безопасность, этап 2 заменит Supabase Auth). */
export const demoOwnerPassword = import.meta.env.VITE_OWNER_PASSWORD ?? 'admin'
