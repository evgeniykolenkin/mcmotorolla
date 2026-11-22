import { computed, ref, unref } from 'vue'
import { COMMENT_PAGE_SIZE } from '../config/comments'
import { commentsRepository } from '../services/commentsRepository'
import { useGuestIdentity } from './useGuestIdentity'

/**
 * Состояние комментариев одной игры.
 *
 * Пагинация — по верхнеуровневым комментариям: первые 20 и все ответы к ним,
 * дальше «Показать ещё». total считается отдельным запросом и включает ответы.
 */
export function useComments(gameId) {
  const { guestId } = useGuestIdentity()

  const threads = ref([])
  const total = ref(0)
  const topLevelTotal = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const submitting = ref(false)
  const deletingId = ref(null)
  const error = ref('')
  const loaded = ref(false)

  // Сколько верхнеуровневых строк уже пришло с сервера — это offset для
  // следующей страницы. Новые локальные комментарии его не сдвигают.
  const serverTopLevel = ref(0)
  let requestId = 0

  const currentGameId = computed(() =>
    typeof gameId === 'function' ? gameId() : unref(gameId)
  )
  const hasMore = computed(() => serverTopLevel.value < topLevelTotal.value)

  function requireRepository() {
    if (!commentsRepository) {
      throw new Error('Комментарии доступны только с Supabase')
    }
    return commentsRepository
  }

  function reset() {
    requestId += 1
    threads.value = []
    total.value = 0
    topLevelTotal.value = 0
    loading.value = false
    loadingMore.value = false
    submitting.value = false
    deletingId.value = null
    error.value = ''
    loaded.value = false
    serverTopLevel.value = 0
  }

  async function refresh() {
    if (!currentGameId.value) return
    const repo = commentsRepository
    if (!repo) {
      error.value = 'Комментарии доступны только с Supabase'
      return
    }
    const request = ++requestId

    loading.value = true
    error.value = ''

    try {
      const [page, count] = await Promise.all([
        repo.listThreads(currentGameId.value, { limit: COMMENT_PAGE_SIZE, offset: 0 }),
        repo.countByGame(currentGameId.value)
      ])

      if (request !== requestId) return

      threads.value = page.threads
      serverTopLevel.value = page.threads.length
      topLevelTotal.value = page.topLevelTotal
      total.value = count
      loaded.value = true
    } catch (err) {
      if (request !== requestId) return
      error.value = err?.message ?? 'Не удалось загрузить комментарии'
    } finally {
      if (request === requestId) loading.value = false
    }
  }

  async function loadMore() {
    if (!currentGameId.value || loadingMore.value || !hasMore.value) return
    const repo = commentsRepository
    if (!repo) {
      error.value = 'Комментарии доступны только с Supabase'
      return
    }
    loadingMore.value = true
    error.value = ''

    try {
      const page = await repo.listThreads(currentGameId.value, {
        limit: COMMENT_PAGE_SIZE,
        offset: serverTopLevel.value
      })

      const byId = new Map(threads.value.map((thread) => [thread.id, thread]))
      for (const serverThread of page.threads) {
        // Локальный комментарий догрузился с сервера — дальше считаем его
        // серверным, чтобы удаление и пагинация не разъезжались.
        if (byId.has(serverThread.id)) byId.get(serverThread.id).local = false
      }
      const fresh = page.threads.filter((thread) => !byId.has(thread.id))
      threads.value.push(...fresh)

      // offset считаем по полученным строкам, а не по количеству после дедупликации:
      // иначе при сдвиге страницы из-за нового комментария можно зациклиться.
      serverTopLevel.value += page.threads.length
      topLevelTotal.value = page.topLevelTotal
    } catch (err) {
      error.value = err?.message ?? 'Не удалось загрузить ещё комментарии'
    } finally {
      loadingMore.value = false
    }
  }

  async function addComment({ authorName, body }) {
    if (!currentGameId.value || submitting.value) {
      if (!currentGameId.value) throw new Error('Не указана игра для комментария')
      return null
    }
    const repo = requireRepository()

    submitting.value = true
    try {
      const created = await repo.create({
        gameId: currentGameId.value,
        parentId: null,
        authorName,
        body,
        guestId: guestId.value
      })

      threads.value = [{ ...created, replies: [], local: true }, ...threads.value]
      total.value += 1
      // topLevelTotal не увеличиваем: новый комментарий уже в списке, а
      // серверный счётчик нужен только для «Показать ещё».
      return created
    } finally {
      submitting.value = false
    }
  }

  async function addReply(thread, { authorName, body }) {
    if (!thread?.id) throw new Error('Комментарий для ответа не найден')
    if (submitting.value) return null
    const repo = requireRepository()

    submitting.value = true
    try {
      const created = await repo.create({
        gameId: currentGameId.value,
        parentId: thread.id,
        authorName,
        body,
        guestId: guestId.value
      })

      thread.replies = [...(thread.replies ?? []), created]
      total.value += 1
      return created
    } finally {
      submitting.value = false
    }
  }

  async function removeComment(comment, thread) {
    if (!comment?.id) return
    const repo = requireRepository()

    deletingId.value = comment.id
    try {
      await repo.remove(comment.id)

      if (comment.parentId) {
        thread.replies = (thread.replies ?? []).filter((reply) => reply.id !== comment.id)
        total.value = Math.max(0, total.value - 1)
        return
      }

      const removedReplies = comment.replies?.length ?? 0
      threads.value = threads.value.filter((item) => item.id !== comment.id)
      total.value = Math.max(0, total.value - 1 - removedReplies)

      // Локально добавленный комментарий ещё не входил в серверный счётчик.
      if (!comment.local) {
        topLevelTotal.value = Math.max(0, topLevelTotal.value - 1)
        serverTopLevel.value = Math.max(0, serverTopLevel.value - 1)
      }
    } finally {
      deletingId.value = null
    }
  }

  return {
    threads,
    total,
    topLevelTotal,
    loading,
    loadingMore,
    submitting,
    deletingId,
    error,
    loaded,
    hasMore,
    reset,
    refresh,
    loadMore,
    addComment,
    addReply,
    removeComment
  }
}
