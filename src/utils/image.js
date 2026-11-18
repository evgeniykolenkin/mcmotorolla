/**
 * Сжатие картинки в браузере перед загрузкой.
 *
 * С телефона прилетают файлы по 3–8 МБ, а в Storage они нужны по 150–250 КБ.
 * Поэтому уменьшаем до maxWidth и перекодируем в WebP (jpg — если браузер
 * не умеет WebP).
 */
async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* старые браузеры — идём через <img> */
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Не удалось прочитать картинку'))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * file → Blob (WebP, если поддерживается).
 * maxWidth/maxHeight — ограничение по большей стороне, quality — 0..1.
 */
export async function compressImage(file, { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = {}) {
  if (!file) throw new Error('Файл не выбран')
  if (!String(file.type ?? '').startsWith('image/')) throw new Error('Это не картинка')

  const image = await loadImage(file)
  const width = image.width || image.naturalWidth
  const height = image.height || image.naturalHeight
  if (!width || !height) throw new Error('Не удалось прочитать картинку')

  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')
  if (!context) return file

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, targetWidth, targetHeight)
  if (typeof image.close === 'function') image.close()

  const webp = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (webp) return webp

  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return jpeg ?? file
}

/** '12,3 КБ' — подпись под превью. */
export function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return ''

  if (value < 1024) return `${value} Б`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} КБ`
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`
}
