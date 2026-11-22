<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { formatDateTime, formatRelativeTime } from '../utils/format'

const props = defineProps({
  comment: { type: Object, required: true },
  isReply: { type: Boolean, default: false },
  isOwner: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false }
})
const emit = defineEmits(['reply', 'delete'])

const displayName = computed(() => String(props.comment.authorName ?? '').trim() || 'Аноним')
const isAnonymous = computed(() => /^Аноним(?: #|$)/i.test(displayName.value))
const initials = computed(() => {
  const words = displayName.value.split(/\s+/).filter(Boolean)
  return (
    words
      .slice(0, 2)
      .map((word) => Array.from(word)[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
})
const timeLabel = computed(() => formatRelativeTime(props.comment.createdAt))
const exactTime = computed(() => formatDateTime(props.comment.createdAt))

function reply() {
  if (!props.deleting) emit('reply', props.comment)
}

function remove() {
  if (!props.deleting) emit('delete', props.comment)
}
</script>

<template>
  <div class="comment" :class="{ 'comment--reply': isReply }">
    <div class="comment__avatar" :class="{ 'comment__avatar--anon': isAnonymous }" aria-hidden="true">
      <i v-if="isAnonymous" class="pi pi-user" />
      <span v-else>{{ initials }}</span>
    </div>

    <div class="comment__main">
      <div class="comment__head">
        <span class="comment__author">{{ displayName }}</span>
        <span v-if="isAnonymous" class="comment__tag muted">гость</span>
        <span class="comment__dot muted" aria-hidden="true">·</span>
        <time class="comment__time muted" :datetime="comment.createdAt" :title="exactTime">
          {{ timeLabel }}
        </time>

        <div class="comment__actions">
          <Button
            label="Ответить"
            icon="pi pi-reply"
            text
            size="small"
            severity="secondary"
            :disabled="deleting"
            @click="reply"
          />
          <Button
            v-if="isOwner"
            v-tooltip.top="'Удалить комментарий'"
            icon="pi pi-trash"
            text
            rounded
            size="small"
            severity="danger"
            aria-label="Удалить комментарий"
            :loading="deleting"
            :disabled="deleting"
            @click="remove"
          />
        </div>
      </div>

      <p class="comment__body">{{ comment.body }}</p>
    </div>
  </div>
</template>

<style scoped>
.comment {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.comment__avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.comment__avatar--anon {
  background: var(--app-surface-2);
  color: var(--app-text-muted);
}

.comment__avatar i {
  font-size: 0.9rem;
}

.comment__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.comment__author {
  font-size: 0.9rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.comment__tag {
  padding: 0 6px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  font-size: 0.66rem;
  line-height: 1.6;
}

.comment__dot,
.comment__time {
  font-size: 0.78rem;
}

.comment__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.comment__actions :deep(.p-button) {
  padding: 4px 8px;
}

.comment__body {
  font-size: 0.94rem;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.comment--reply {
  gap: 10px;
}

.comment--reply .comment__avatar {
  width: 32px;
  height: 32px;
  font-size: 0.72rem;
}

@media (max-width: 640px) {
  .comment {
    gap: 10px;
  }

  .comment__avatar {
    width: 34px;
    height: 34px;
  }

  .comment__actions {
    width: 100%;
    margin-left: 0;
  }

  .comment__actions :deep(.p-button) {
    padding-left: 0;
  }
}
</style>
