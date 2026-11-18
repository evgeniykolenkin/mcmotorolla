import { site } from './site'

/**
 * Тексты, которые владелец правит прямо на сайте (шапка и главная секция).
 *
 * Здесь — значения по умолчанию: они показываются, пока в базе нет своих
 * (и если Supabase недоступен). Реальные правки лежат в public.site_settings
 * и перекрывают дефолт по ключу.
 *
 * Ключ — путь через точку: 'hero.title' → content.hero.title.
 */
export const contentDefaults = {
  brand: {
    nickname: site.nickname,
    tagline: site.tagline,
    avatarUrl: ''
  },
  hero: {
    eyebrow: 'дневник пройденных игр',
    title: site.tagline,
    subtitle: site.subtitle,
    primaryLabel: 'Смотреть на Twitch',
    secondaryLabel: 'Телеграм-канал',
    bgUrl: ''
  }
}

/**
 * Пустое значение в базе не должно оставлять шапку или заголовок без текста,
 * поэтому для этих ключей пустая строка = «показывать дефолт».
 * Для ссылок на картинки пустая строка — это осознанное «картинки нет».
 */
const KEEP_DEFAULT_WHEN_EMPTY = new Set([
  'brand.nickname',
  'brand.tagline',
  'hero.eyebrow',
  'hero.title',
  'hero.subtitle',
  'hero.primaryLabel',
  'hero.secondaryLabel'
])

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
    const value = rawValue === null || rawValue === undefined ? '' : String(rawValue)
    if (!value && KEEP_DEFAULT_WHEN_EMPTY.has(key)) continue
    setByPath(result, key, value)
  }

  return result
}
