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
    // Куда кадрировать фон главной: top | center | bottom
    bgPosition: 'center'
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

export const MAX_EXTRA_BUTTONS = 4

export const BG_POSITIONS = [
  { label: 'Верх', value: 'top' },
  { label: 'Центр', value: 'center' },
  { label: 'Низ', value: 'bottom' }
]

const ICON_VALUES = new Set(BUTTON_ICONS.map((icon) => icon.value))
const POSITION_VALUES = new Set(BG_POSITIONS.map((position) => position.value))
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

/** Позиция фона: незнакомое значение превращается в центр. */
export function normalizeBgPosition(value) {
  const position = String(value ?? '').trim()
  return POSITION_VALUES.has(position) ? position : 'center'
}

/**
 * Пустое значение в базе не должно оставлять шапку или заголовок без текста,
 * поэтому для этих ключей пустая строка = «показывать дефолт».
 * Для картинок и ссылок кнопок hero пустая строка — осознанное действие:
 * «картинки нет» / «кнопку скрыть».
 */
const KEEP_DEFAULT_WHEN_EMPTY = new Set([
  'hero.eyebrow',
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

/** Иконки базовых кнопок тоже приходят из базы — проверяем по белому списку. */
const ICON_KEYS = new Set(['hero.primaryIcon', 'hero.secondaryIcon'])

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
    if (ICON_KEYS.has(key)) {
      setByPath(result, key, ICON_VALUES.has(value) ? value : FALLBACK_ICON)
      continue
    }

    setByPath(result, key, value)
  }

  return result
}
