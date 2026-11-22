<script setup>
import { ref, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import CommentForm from './CommentForm.vue'
import CommentItem from './CommentItem.vue'
import { useAuth } from '../composables/useAuth'
import { useComments } from '../composables/useComments'

const props = defineProps({
  gameId: { type: String, required: true },
  gameTitle: { type: String, default: '' }
})

const confirm = useConfirm()
const toast = useToast()
const { isOwner } = useAuth()

const {
  threads,
  total,
  loading,
  loadingMore,
  submitting,
  deletingId,
  error,
  hasMore,
  reset,
  refresh,
  loadMore,
  addComment,
  addReply,
  removeComment
} = useComments(() => props.gameId)

const topForm = ref(null)
const topError = ref('')
const replyError = ref('')
const replyTarget = ref(null)
const expanded = ref({})

function resetUi() {
  replyTarget.value = null
  replyError.value = ''
  topError.value = ''
  expanded.value = {}
  topForm.value?.resetBody()
}

watch(
  () => props.gameId,
  () => {
    resetUi()
    reset()
    refresh()
  },
  { immediate: true }
)

function isExpanded(threadId) {
  return Boolean(expanded.value[threadId])
}

function toggleThread(threadId) {
  expanded.value = {
    ...expanded.value,
    [threadId]: !expanded.value[threadId]
  }
}

function startReply(comment, thread) {
  replyError.value = ''
  replyTarget.value = {
    threadId: thread.id,
    commentId: comment.id,
    authorName: comment.authorName
  }
  expanded.value = { ...expanded.value, [thread.id]: true }
}

function cancelReply() {
  replyTarget.value = null
  replyError.value = ''
}

async function onTopSubmit(payload) {
  topError.value = ''
  try {
    const created = await addComment(payload)
    if (created) topForm.value?.resetBody()
  } catch (err) {
    topError.value = err?.message ?? 'Не удалось отправить комментарий'
  }
}

async function onReplySubmit(payload) {
  if (!replyTarget.value) return
  const target = replyTarget.value
  const thread = threads.value.find((item) => item.id === target.threadId)
  if (!thread) return

  replyError.value = ''
  try {
    const created = await addReply(thread, payload)
    if (!created) return
    expanded.value = { ...expanded.value, [thread.id]: true }
    replyTarget.value = null
  } catch (err) {
    replyError.value = err?.message ?? 'Не удалось отправить ответ'
  }
}

function askDelete(comment, thread) {
  if (!isOwner.value) return

  const isTopLevel = !comment.parentId
  const replies = comment.replies?.length ?? 0
  const message =
    isTopLevel && replies > 0
      ? `Комментарий и ответы (${replies}) удалятся безвозвратно.`
      : isTopLevel
        ? 'Комментарий исчезнет безвозвратно.'
        : 'Ответ исчезнет безвозвратно.'

  confirm.require({
    header: 'Удалить комментарий?',
    message,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Отмена', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Удалить', severity: 'danger' },
    accept: async () => {
      try {
        await removeComment(comment, thread)

        if (replyTarget.value?.commentId === comment.id) replyTarget.value = null
        if (isTopLevel && replyTarget.value?.threadId === thread.id) replyTarget.value = null

        toast.add({
          severity: 'success',
          summary: 'Комментарий удалён',
          life: 2200
        })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Не удалось удалить',
          detail: err?.message ?? 'Попробуйте ещё раз',
          life: 4200
        })
      }
    }
  })
}
</script>

<template>
  <section class="comments surface" aria-labelledby="comments-title">
    <header class="comments__head">
      <div>
        <h2 id="comments-title" class="comments__title">
          Комментарии
          <span class="comments__count" :aria-label="`Всего комментариев: ${total}`">
            {{ total }}
          </span>
        </h2>
        <p class="comments__hint muted">
          Без регистрации. Один уровень ответов, ник можно не указывать.
        </p>
      </div>
    </header>

    <CommentForm
      ref="topForm"
      :submitting="submitting"
      :error="topError"
      submit-label="Отправить"
      @submit="onTopSubmit"
      @typing="topError = ''"
    />

    <Message v-if="error" severity="error" :closable="false">
      <div class="comments__error-body">
        <span>{{ error }}</span>
        <Button
          label="Повторить"
          icon="pi pi-refresh"
          text
          size="small"
          severity="secondary"
          @click="refresh"
        />
      </div>
    </Message>

    <div v-if="loading && !threads.length" class="comments__skeleton" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="comments__skeleton-row">
        <Skeleton shape="circle" size="2.375rem" />
        <div class="comments__skeleton-lines">
          <Skeleton height="0.8rem" width="28%" />
          <Skeleton height="0.9rem" width="92%" />
          <Skeleton height="0.9rem" width="64%" />
        </div>
      </div>
    </div>

    <div v-else-if="threads.length" class="comments__list">
      <article v-for="thread in threads" :key="thread.id" class="thread">
        <CommentItem
          :comment="thread"
          :is-owner="isOwner"
          :deleting="deletingId === thread.id"
          @reply="startReply(thread, thread)"
          @delete="askDelete(thread, thread)"
        />

        <div v-if="thread.replies?.length" class="thread__replies">
          <button
            type="button"
            class="thread__toggle"
            :aria-expanded="isExpanded(thread.id)"
            :aria-controls="`replies-${thread.id}`"
            @click="toggleThread(thread.id)"
          >
            <i
              class="pi"
              :class="isExpanded(thread.id) ? 'pi-chevron-up' : 'pi-chevron-down'"
            />
            {{
              isExpanded(thread.id)
                ? 'Скрыть ответы'
                : `Показать ответы (${thread.replies.length})`
            }}
          </button>

          <div
            v-if="isExpanded(thread.id)"
            :id="`replies-${thread.id}`"
            class="thread__replies-list"
          >
            <CommentItem
              v-for="reply in thread.replies"
              :key="reply.id"
              :comment="reply"
              is-reply
              :is-owner="isOwner"
              :deleting="deletingId === reply.id"
              @reply="startReply(reply, thread)"
              @delete="askDelete(reply, thread)"
            />
          </div>
        </div>

        <CommentForm
          v-if="replyTarget && replyTarget.threadId === thread.id"
          :key="replyTarget.commentId"
          :submitting="submitting"
          :error="replyError"
          :reply-to-name="replyTarget.authorName"
          submit-label="Ответить"
          @submit="onReplySubmit"
          @cancel="cancelReply"
          @typing="replyError = ''"
        />
      </article>
    </div>

    <div v-else-if="!loading && !error" class="comments__empty">
      <i class="pi pi-comments comments__empty-icon" />
      <p class="comments__empty-title">Пока тихо</p>
      <p class="comments__empty-text muted">
        <template v-if="gameTitle">Никто ещё не оставил комментарий к «{{ gameTitle }}». </template>
        Будьте первым — регистрация не нужна.
      </p>
    </div>

    <div v-if="hasMore" class="comments__more">
      <Button
        label="Показать ещё"
        icon="pi pi-chevron-down"
        text
        size="small"
        :loading="loadingMore"
        @click="loadMore"
      />
    </div>
  </section>
</template>


<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  min-width: 0;
}

.comments__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.comments__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
}

.comments__count {
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.7;
}

.comments__hint {
  margin-top: 4px;
  font-size: 0.82rem;
}

.comments__list {
  display: flex;
  flex-direction: column;
}

.thread {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 0;
  min-width: 0;
}

.thread:first-child {
  padding-top: 2px;
}

.thread + .thread {
  border-top: 1px solid var(--app-border);
}

.thread__replies {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-left: 18px;
  padding-left: 14px;
  border-left: 2px solid var(--app-border);
}

.thread__toggle {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--app-accent);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
}

.thread__toggle i {
  font-size: 0.7rem;
}

.thread__toggle:hover {
  color: var(--app-text);
}

.thread__replies-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comments__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 12px 12px;
  text-align: center;
}

.comments__empty-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 2px;
  border-radius: 14px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  font-size: 1.2rem;
  line-height: 1;
}

.comments__empty-title {
  font-weight: 700;
}

.comments__empty-text {
  max-width: 440px;
  font-size: 0.88rem;
}

.comments__skeleton {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0;
}

.comments__skeleton-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.comments__skeleton-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.comments__more {
  display: flex;
  justify-content: center;
  padding-top: 2px;
}

.comments__error-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .comments {
    gap: 14px;
    padding: 16px;
    border-radius: 14px;
  }

  .thread {
    padding: 14px 0;
  }

  .thread__replies {
    margin-left: 0;
    padding-left: 12px;
  }
}
</style>
