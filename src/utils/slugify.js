const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
}

/** «Ведьмак 3: Дикая Охота» → «vedmak-3-dikaya-ohota» */
export function slugify(value = '') {
  return value
    .toString()
    .toLowerCase()
    .split('')
    .map((char) => (char in TRANSLIT ? TRANSLIT[char] : char))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Гарантирует уникальность slug в списке игр. */
export function uniqueSlug(title, games = [], currentId = null) {
  const base = slugify(title) || 'game'
  const taken = new Set(
    games.filter((game) => game.id !== currentId).map((game) => game.slug)
  )

  if (!taken.has(base)) return base

  let index = 2
  while (taken.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}
