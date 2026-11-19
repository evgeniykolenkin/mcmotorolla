/** '2024-03-15' → '15 марта 2024' */
export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/** 12.5 → '12,5 ч' */
export function formatHours(value) {
  if (value === null || value === undefined || value === '') return ''
  return `${String(value).replace('.', ',')} ч`
}

export const RATING_LABELS = {
  10: 'Шедевр',
  9: 'Великолепно',
  8: 'Отлично',
  7: 'Хорошо',
  6: 'Неплохо',
  5: 'Средне',
  4: 'Слабо',
  3: 'Плохо',
  2: 'Очень плохо',
  1: 'Ужасно'
}

/**
 * Статусы прохождения: порядок — приоритет в сортировке «По прохождению»
 * и в селекте формы (сначала пройденные, потом текущие, потом брошенные).
 */
export const STATUS_OPTIONS = [
  { label: 'Пройдена', value: 'completed' },
  { label: 'Прохожу сейчас', value: 'playing' },
  { label: 'Брошена', value: 'dropped' }
]

export const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label])
)

/**
 * Короткие подписи для бейджа на карточке: «Прохожу сейчас» в узкую плашку
 * не влезает. Полные подписи остаются в форме и в title бейджа.
 */
export const STATUS_SHORT_LABELS = {
  completed: 'Пройдена',
  playing: 'Прохожу',
  dropped: 'Брошена'
}

/**
 * Статус для бейджа: старые записи без статуса считаем пройденными —
 * ровно так же, как сортировка «По прохождению» в useGames.
 */
export function statusTone(status) {
  const value = STATUS_SHORT_LABELS[status] ? status : 'completed'
  return {
    tone: value,
    short: STATUS_SHORT_LABELS[value],
    label: STATUS_LABELS[value]
  }
}

/**
 * Цветовая шкала оценки 1–10.
 * tone — суффикс для CSS-класса, label — текстовое пояснение.
 */
export function ratingTone(rating = 0) {
  const value = Number(rating)

  if (value >= 9) return { tone: 'great', label: RATING_LABELS[value] ?? 'Топ' }
  if (value >= 7) return { tone: 'good', label: RATING_LABELS[value] ?? 'Хорошо' }
  if (value >= 5) return { tone: 'meh', label: RATING_LABELS[value] ?? 'Средне' }
  return { tone: 'bad', label: RATING_LABELS[value] ?? 'Слабо' }
}

/** Date → 'YYYY-MM-DD' (локальная дата, без сдвигов часового пояса). */
export function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 'YYYY-MM-DD' → Date (локальная полночь). */
export function fromIsoDate(value) {
  if (!value) return new Date()
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return new Date()

  return new Date(year, month - 1, day)
}

