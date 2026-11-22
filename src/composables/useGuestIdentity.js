import { ref, watch } from 'vue'
import { COMMENT_AUTHOR_MAX } from '../config/comments'

/**
 * Гостевая идентичность для комментариев.
 *
 * guestId — случайный UUID браузера. Он нужен только для анонимной подписи
 * «Аноним #XXXX» и простого лимита частоты; подменить его несложно, поэтому
 * это не защита от целенаправленного флуда.
 *
 * Ник хранится отдельно и необязателен: пустое значение превращается в
 * «Аноним #XXXX» уже в базе. Ник не считается признаком владельца — бейдж
 * администратора нигде не строится по имени.
 */
const GUEST_KEY = 'mcmotorolla.comment-guest.v1'
const NAME_KEY = 'mcmotorolla.comment-name.v1'

function readStorage(key) {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* приватный режим или отключённое хранилище — работаем без запоминания */
  }
}

function makeGuestId() {
  try {
    return crypto.randomUUID()
  } catch {
    // Очень старый браузер: запасной UUID v4 из случайных байт.
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}

const storedGuestId = readStorage(GUEST_KEY)
const guestId = ref(storedGuestId || makeGuestId())
if (!storedGuestId) writeStorage(GUEST_KEY, guestId.value)

const authorName = ref(readStorage(NAME_KEY).slice(0, COMMENT_AUTHOR_MAX))

watch(authorName, (value) => {
  writeStorage(NAME_KEY, String(value ?? '').trim().slice(0, COMMENT_AUTHOR_MAX))
})

export function useGuestIdentity() {
  return { guestId, authorName }
}
