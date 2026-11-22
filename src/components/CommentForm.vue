<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { COMMENT_AUTHOR_MAX, COMMENT_BODY_MAX } from '../config/comments'
import { useGuestIdentity } from '../composables/useGuestIdentity'

const props = defineProps({
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  replyToName: { type: String, default: '' },
  submitLabel: { type: String, default: 'Отправить' }
})
const emit = defineEmits(['submit', 'cancel', 'typing'])

const { authorName } = useGuestIdentity()
const body = ref('')
const localError = ref('')

const isReply = computed(() => Boolean(props.replyToName))
const bodyLength = computed(() => body.value.length)
const isOverLimit = computed(() => bodyLength.value > COMMENT_BODY_MAX)
const canSubmit = computed(
  () => body.value.trim().length > 0 && !isOverLimit.value && !props.submitting
)

watch(body, () => {
  if (localError.value) localError.value = ''
  if (props.error) emit('typing')
})

function submit() {
  localError.value = ''

  if (!body.value.trim()) {
    localError.value = 'Введите комментарий'
    return
  }
  if (isOverLimit.value) {
    localError.value = `Комментарий не длиннее ${COMMENT_BODY_MAX} символов`
    return
  }

  emit('submit', {
    authorName: String(authorName.value ?? '').trim(),
    body: body.value.trim()
  })
}

function resetBody() {
  body.value = ''
  localError.value = ''
}

defineExpose({ resetBody })
</script>

<template>
  <form class="comment-form" @submit.prevent="submit">
    <div v-if="isReply" class="comment-form__reply">
      <span>
        Ответ для <strong class="comment-form__reply-name">{{ replyToName }}</strong>
      </span>
      <Button
        type="button"
        label="Отмена"
        icon="pi pi-times"
        text
        size="small"
        severity="secondary"
        @click="emit('cancel')"
      />
    </div>

    <div class="comment-form__who">
      <InputText
        v-model="authorName"
        :maxlength="COMMENT_AUTHOR_MAX"
        placeholder="Аноним"
        aria-label="Ваш ник (необязательно)"
        autocomplete="nickname"
        class="comment-form__name"
        fluid
      />
      <span class="comment-form__hint muted">Ник необязателен — можно анонимно</span>
    </div>

    <Textarea
      v-model="body"
      :maxlength="COMMENT_BODY_MAX"
      rows="3"
      placeholder="Поделитесь впечатлением об игре…"
      aria-label="Текст комментария"
      class="comment-form__body"
      fluid
    />

    <div class="comment-form__footer">
      <span class="comment-form__counter" :class="{ 'is-over': isOverLimit }">
        {{ bodyLength }} / {{ COMMENT_BODY_MAX }}
      </span>
      <Button
        type="submit"
        :label="submitLabel"
        icon="pi pi-send"
        size="small"
        :loading="submitting"
        :disabled="!canSubmit"
      />
    </div>

    <Message v-if="localError || error" severity="error" :closable="false" size="small">
      {{ localError || error }}
    </Message>
  </form>
</template>

<style scoped>
.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-bg-soft);
}

.comment-form__reply {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.82rem;
  color: var(--app-text-muted);
}

.comment-form__reply-name {
  color: var(--app-text);
  overflow-wrap: anywhere;
}

.comment-form__who {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.comment-form__name {
  width: min(230px, 100%);
}

.comment-form__hint {
  font-size: 0.76rem;
}

.comment-form__body {
  width: 100%;
  min-height: 82px;
  resize: vertical;
}

.comment-form__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.comment-form__counter {
  margin-right: auto;
  font-size: 0.76rem;
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
}

.comment-form__counter.is-over {
  color: var(--tone-bad);
  font-weight: 700;
}

@media (max-width: 640px) {
  .comment-form {
    padding: 12px;
  }

  .comment-form__name {
    width: 100%;
  }

  .comment-form__footer {
    flex-wrap: wrap;
  }

  .comment-form__footer :deep(.p-button) {
    flex: 1;
  }
}
</style>
