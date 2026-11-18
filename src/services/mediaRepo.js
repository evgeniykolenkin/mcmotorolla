import { isSupabaseConfigured, supabase } from './supabaseClient'

const BUCKET = 'media'

/** В локальном режиме грузить некуда — остаётся вставить ссылку на картинку. */
export const isUploadAvailable = isSupabaseConfigured

function toError(error) {
  const message = String(error?.message ?? '')

  if (/row-level security/i.test(message)) {
    return new Error('Нет прав на загрузку: войдите как владелец')
  }
  if (/bucket not found/i.test(message)) {
    return new Error('В Supabase нет бакета media — выполните supabase/0003_site_settings_and_media.sql')
  }
  if (/maximum allowed size|payload too large|too large/i.test(message)) {
    return new Error('Файл слишком большой — выберите картинку поменьше')
  }
  if (/mime type|not supported/i.test(message)) {
    return new Error('Такой формат не поддерживается — нужен jpg, png или webp')
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return new Error('Нет связи с Supabase — проверьте интернет')
  }

  return new Error(message || 'Не удалось загрузить картинку')
}

/** Публичная ссылка → путь внутри бакета (для удаления старого файла). */
export function pathFromPublicUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = String(url ?? '').indexOf(marker)
  return index === -1 ? '' : String(url).slice(index + marker.length)
}

function randomName(blob) {
  const extension = String(blob?.type ?? '').split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg'
  const unique =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `${Date.now()}-${unique}.${extension}`
}

/**
 * Загружает сжатый блоб в бакет media.
 * folder — 'avatar' или 'hero' (эти папки разрешены политиками Storage).
 */
export async function uploadImage(blob, folder = 'hero') {
  if (!isSupabaseConfigured) {
    throw new Error('Загрузка файлов работает только с Supabase — вставьте ссылку на картинку')
  }

  const path = `${folder}/${randomName(blob)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: '31536000',
    contentType: blob.type || 'image/jpeg',
    upsert: false
  })

  if (error) throw toError(error)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/** Удаляет файл, если ссылка ведёт в наш бакет. Ошибки не критичны. */
export async function removeImage(url) {
  const path = pathFromPublicUrl(url)
  if (!path || !isSupabaseConfigured) return

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('[media] не удалось удалить старый файл:', error.message)
}
