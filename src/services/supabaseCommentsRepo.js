import { COMMENT_AUTHOR_MAX, COMMENT_BODY_MAX } from '../config/comments'
import { supabase } from './supabaseClient'

const TABLE = 'comments'

// guest_id намеренно не запрашиваем: он нужен только базе для подписи и лимитов.
const COMMENT_COLUMNS =
  'id, game_id, parent_id, author_name, body, created_at, updated_at'

function toText(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

/** snake_case из БД → camelCase приложения. */
function rowToComment(row) {
  return {
    id: row.id,
    gameId: row.game_id,
    parentId: row.parent_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replies: []
  }
}

function toError(error) {
  const message = String(error?.message ?? '')

  if (/relation .*comments.* does not exist|Could not find the table .*comments/i.test(message)) {
    return new Error(
      'В Supabase не выполнена миграция комментариев — запустите supabase/0004_comments.sql'
    )
  }
  if (/column .* does not exist/i.test(message)) {
    return new Error(
      'В Supabase не выполнена миграция комментариев — запустите supabase/0004_comments.sql'
    )
  }
  if (/permission denied for table comments|permission denied for relation comments/i.test(message)) {
    return new Error(
      'Нет доступа к комментариям: выполните supabase/0004_comments.sql и проверьте гранты'
    )
  }
  if (/row-level security/i.test(message)) {
    return new Error('Комментарии можно оставлять только к опубликованным играм')
  }
  if (/Введите комментарий|Комментарий не длиннее 500/i.test(message)) {
    return new Error(message)
  }
  if (/Ник не длиннее 40/i.test(message)) {
    return new Error(message)
  }
  if (/Слишком часто|Слишком много комментариев|Такой комментарий уже отправлен/i.test(message)) {
    return new Error(message)
  }
  if (/Родительский комментарий|Ответ должен быть|Ответы на ответы/i.test(message)) {
    return new Error(message)
  }
  if (/JWT|token is expired|session/i.test(message)) {
    return new Error('Сессия истекла — войдите заново')
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return new Error('Нет связи с Supabase — проверьте интернет')
  }

  return new Error(message || 'Ошибка Supabase')
}

function assertCommentInput({ body, authorName }) {
  const text = toText(body)
  const name = toText(authorName)

  if (!text) throw new Error('Введите комментарий')
  if (text.length > COMMENT_BODY_MAX) {
    throw new Error(`Комментарий не длиннее ${COMMENT_BODY_MAX} символов`)
  }
  if (name.length > COMMENT_AUTHOR_MAX) {
    throw new Error(`Ник не длиннее ${COMMENT_AUTHOR_MAX} символов`)
  }

  return { body: text, authorName: name }
}

/**
 * Первые `limit` верхнеуровневых комментариев + все ответы к ним.
 * Ответы грузим отдельным запросом по id родителей: так не нужен self-join
 * и сохраняется простой порядок «новые сверху, ответы внутри — старые сверху».
 */
export async function listThreads(gameId, { limit = 20, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from(TABLE)
    .select(COMMENT_COLUMNS, { count: 'exact' })
    .eq('game_id', gameId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw toError(error)

  const topLevel = (data ?? []).map(rowToComment)
  const repliesByParent = new Map()

  if (topLevel.length) {
    const { data: replyRows, error: replyError } = await supabase
      .from(TABLE)
      .select(COMMENT_COLUMNS)
      .in(
        'parent_id',
        topLevel.map((comment) => comment.id)
      )
      .order('created_at', { ascending: true })

    if (replyError) throw toError(replyError)

    for (const row of replyRows ?? []) {
      const reply = rowToComment(row)
      if (!repliesByParent.has(reply.parentId)) repliesByParent.set(reply.parentId, [])
      repliesByParent.get(reply.parentId).push(reply)
    }
  }

  return {
    threads: topLevel.map((comment) => ({
      ...comment,
      replies: repliesByParent.get(comment.id) ?? []
    })),
    topLevelTotal: count ?? topLevel.length
  }
}

/** Общее число комментариев игры, включая ответы. */
export async function countByGame(gameId) {
  // Обычный GET, а не HEAD: у HEAD-ошибки нет тела, и сообщение о
  // невыполненной миграции терялось бы, превращаясь в «Ошибка Supabase».
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact' })
    .eq('game_id', gameId)
    .limit(1)

  if (error) throw toError(error)
  return count ?? 0
}

export async function create({ gameId, parentId = null, authorName, body, guestId }) {
  if (!gameId) throw new Error('Не указана игра для комментария')

  const input = assertCommentInput({ body, authorName })
  const row = {
    game_id: gameId,
    parent_id: parentId || null,
    author_name: input.authorName,
    body: input.body,
    guest_id: guestId || crypto.randomUUID()
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select(COMMENT_COLUMNS)
    .single()

  if (error) throw toError(error)
  return rowToComment(data)
}

export async function remove(id) {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id')

  if (error) throw toError(error)
  if (!data?.length) throw new Error('Комментарий не найден или нет прав на удаление')
}
