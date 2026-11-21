import { site } from './site'

/**
 * Тексты, которые владелец правит прямо на сайте (шапка, главная секция, подвал).
 *
 * Здесь — значения по умолчанию: они показываются, пока в базе нет своих
 * (и если Supabase недоступен). Реальные правки лежат в public.site_settings
 * и перекрывают дефолт по ключу.
 *
 * Ключ — путь через точку: 'hero.title' → content.hero.title.
 */
export const contentDefaults = {
  // В шапке правится только картинка: ник и подпись живут в src/config/site.js
  brand: {
    avatarUrl: ''
  },
  hero: {
    eyebrow: 'дневник пройденных игр',
    eyebrowIcon: 'pi pi-star-fill',
    title: site.tagline,
    subtitle: site.subtitle,
    primaryLabel: 'Смотреть на Twitch',
    primaryUrl: site.twitchUrl,
    primaryIcon: 'pi pi-twitch',
    secondaryLabel: 'Телеграм-канал',
    secondaryUrl: site.telegramUrl,
    secondaryIcon: 'pi pi-telegram',
    // Добавленные владельцем кнопки: JSON-массив [{ label, url, icon }]
    extraButtons: [],
    bgUrl: '',
    // Куда кадрировать фон главной: CSS object-position в процентах
    bgPosition: '50% 50%'
  },
  footer: {
    text: `${site.nickname} · дневник пройденных игр`
  }
}

/** Иконки для кнопок hero — только те, что есть в PrimeIcons. */
export const BUTTON_ICONS = [
  { label: 'Twitch', value: 'pi pi-twitch' },
  { label: 'Telegram', value: 'pi pi-telegram' },
  { label: 'YouTube', value: 'pi pi-youtube' },
  { label: 'Discord', value: 'pi pi-discord' },
  { label: 'Twitter / X', value: 'pi pi-twitter' },
  { label: 'Instagram', value: 'pi pi-instagram' },
  { label: 'TikTok', value: 'pi pi-tiktok' },
  { label: 'Facebook', value: 'pi pi-facebook' },
  { label: 'Сайт', value: 'pi pi-globe' },
  { label: 'Ссылка', value: 'pi pi-link' },
  { label: 'Донат', value: 'pi pi-heart' },
  { label: 'Игра', value: 'pi pi-star' },
  { label: 'Видео', value: 'pi pi-video' },
  { label: 'Внешняя ссылка', value: 'pi pi-external-link' }
]

/**
 * Иконки надписи над заголовком — декоративные, поэтому набор свой:
 * соцсети здесь ни к чему, зато есть звезда (дефолт), кубок, корона и т.п.
 */
export const EYEBROW_ICONS = [
  { label: 'Звезда', value: 'pi pi-star-fill' },
  { label: 'Звезда (контур)', value: 'pi pi-star' },
  { label: 'Сердце', value: 'pi pi-heart-fill' },
  { label: 'Сердце (контур)', value: 'pi pi-heart' },
  { label: 'Молния', value: 'pi pi-bolt' },
  { label: 'Искры', value: 'pi pi-sparkles' },
  { label: 'Кубок', value: 'pi pi-trophy' },
  { label: 'Корона', value: 'pi pi-crown' },
  { label: 'Закладка', value: 'pi pi-bookmark-fill' },
  { label: 'Флаг', value: 'pi pi-flag-fill' },
  { label: 'Компас', value: 'pi pi-compass' },
  { label: 'Глобус', value: 'pi pi-globe' },
  { label: 'Палитра', value: 'pi pi-palette' },
  { label: 'Щит', value: 'pi pi-shield' }
]

export const MAX_EXTRA_BUTTONS = 4

/**
 * Положение фона главной — это значение CSS object-position в процентах.
 * Проценты, а не top/center/bottom: владелец выбирает любой кусок кадра,
 * а не три фиксированных, и это же значение двигает рамку в диалоге.
 */
export const BG_POSITIONS = [
  { label: 'Верх', value: '50% 0%' },
  { label: 'Центр', value: '50% 50%' },
  { label: 'Низ', value: '50% 100%' }
]

// Белый список общий: иконка кнопки и иконка надписи проверяются одинаково
const ICON_VALUES = new Set([...BUTTON_ICONS, ...EYEBROW_ICONS].map((icon) => icon.value))
// Старые записи в базе: до раунда 5 позиция хранилась как top | center | bottom
const POSITION_PRESETS = { top: '50% 0%', center: '50% 50%', bottom: '50% 100%' }
const POSITION_PATTERN = /^(\d{1,3})%\s+(\d{1,3})%$/
const FALLBACK_ICON = 'pi pi-external-link'

/** Ссылка кнопки: только http(s), иначе пустая строка. */
export function normalizeUrl(value) {
  const url = String(value ?? '').trim()
  if (!/^https?:\/\//i.test(url)) return ''

  try {
    return new URL(url).toString()
  } catch {
    return ''
  }
}

function normalizeExtraButton(raw) {
  if (!raw || typeof raw !== 'object') return null

  const label = String(raw.label ?? '').trim().slice(0, 40)
  const url = normalizeUrl(raw.url)
  if (!label || !url) return null

  const icon = ICON_VALUES.has(raw.icon) ? raw.icon : FALLBACK_ICON
  return { label, url, icon }
}

/** Массив добавленных кнопок из JSON: чистим мусор и ограничиваем количество. */
export function normalizeExtraButtons(value) {
  const list = Array.isArray(value) ? value : []

  return list.map(normalizeExtraButton).filter(Boolean).slice(0, MAX_EXTRA_BUTTONS)
}

/**
 * Позиция фона: старые top/center/bottom, проценты вида «50% 30%» или дефолт.
 * Проценты ограничиваем 0–100, чтобы в CSS не улетело что-то вроде «300%».
 */
export function normalizeBgPosition(value) {
  const position = String(value ?? '').trim().toLowerCase()
  if (POSITION_PRESETS[position]) return POSITION_PRESETS[position]

  const match = position.match(POSITION_PATTERN)
  if (!match) return '50% 50%'

  const clamp = (part) => Math.min(100, Math.max(0, Number(part)))
  return `${clamp(match[1])}% ${clamp(match[2])}%`
}

/**
 * Пустое значение в базе не должно оставлять шапку или заголовок без текста,
 * поэтому для этих ключей пустая строка = «показывать дефолт».
 * Для картинок и ссылок кнопок hero пустая строка — осознанное действие:
 * «картинки нет» / «кнопку скрыть».
 */
const KEEP_DEFAULT_WHEN_EMPTY = new Set([
  'hero.eyebrow',
  'hero.eyebrowIcon',
  'hero.title',
  'hero.subtitle',
  'hero.primaryLabel',
  'hero.primaryIcon',
  'hero.secondaryLabel',
  'hero.secondaryIcon',
  'footer.text'
])

/** Ключи, которые в базе лежат строкой JSON, а в приложении — массивом. */
const JSON_KEYS = new Set(['hero.extraButtons'])

/**
 * Иконки приходят из базы — проверяем по белому списку и подставляем дефолт
 * конкретного ключа (у надписи — звезда, у кнопок — внешняя ссылка).
 */
const ICON_FALLBACKS = {
  'hero.eyebrowIcon': 'pi pi-star-fill',
  'hero.primaryIcon': FALLBACK_ICON,
  'hero.secondaryIcon': FALLBACK_ICON
}

/** 'hero.title' → значение во вложенном объекте (или undefined). */
export function getByPath(source, path) {
  return String(path)
    .split('.')
    .reduce((value, part) => (value === null || value === undefined ? undefined : value[part]), source)
}

/** 'hero.title' → записывает значение во вложенный объект, создавая уровни. */
export function setByPath(target, path, value) {
  const parts = String(path).split('.')
  const last = parts.pop()
  let node = target

  for (const part of parts) {
    if (!node[part] || typeof node[part] !== 'object') node[part] = {}
    node = node[part]
  }

  node[last] = value
  return target
}

/** Дефолт для конкретного ключа — нужен кнопке «вернуть как было». */
export function defaultFor(key) {
  return getByPath(contentDefaults, key) ?? ''
}

/**
 * Дефолты + правки из базы. Правки приходят плоским объектом
 * ({ 'hero.title': '…' }) и разворачиваются в дерево.
 */
export function applyOverrides(overrides = {}, defaults = contentDefaults) {
  const result = JSON.parse(JSON.stringify(defaults))

  for (const [key, rawValue] of Object.entries(overrides ?? {})) {
    // Массивы (добавленные кнопки) хранятся строкой JSON: битый JSON — не повод падать
    if (JSON_KEYS.has(key)) {
      try {
        setByPath(result, key, normalizeExtraButtons(JSON.parse(String(rawValue ?? ''))))
      } catch {
        // оставляем дефолт (пустой список)
      }
      continue
    }

    const value = rawValue === null || rawValue === undefined ? '' : String(rawValue)
    if (!value && KEEP_DEFAULT_WHEN_EMPTY.has(key)) continue
    if (key === 'hero.bgPosition') {
      setByPath(result, key, normalizeBgPosition(value))
      continue
    }
    if (key in ICON_FALLBACKS) {
      const fallback = ICON_FALLBACKS[key]
      setByPath(result, key, ICON_VALUES.has(value) ? value : fallback)
      continue
    }

    setByPath(result, key, value)
  }

  return result
}
