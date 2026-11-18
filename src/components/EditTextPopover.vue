<script setup>
import { computed, nextTick, ref } from 'vue'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useSiteContent } from '../composables/useSiteContent'
import { getByPath } from '../config/content'

const props = defineProps({
  modelKey: { type: String, required: true },
  label: { type: String, default: 'Текст' },
  multiline: { type: Boolean, default: false },
  maxlength: { type: Number, default: 160 },
  placeholder: { type: String, default: '' }
})

const { content, overrides, save, reset, saving } = useSiteContent()

const popover = ref(null)
const inputRef = ref(null)
const draft = ref('')
const error = ref('')

const current = computed(() => getByPath(content.value, props.modelKey) ?? '')
const hasOwnValue = computed(() =>
  Object.prototype.hasOwnProperty.call(overrides.value, props.modelKey)
)

function open(event) {
  draft.value = current.value
  error.value = ''
  popover.value?.toggle(event)
}

function close() {
  popover.value?.hide()
}

async function focusInput() {
  await nextTick()
  const element = inputRef.value?.$el
  element?.focus()
  element?.select?.()
}

async function submit() {
  const value = draft.value.trim()

  if (!value) {
    error.value = 'Текст не может быть пустым'
    return
  }
  if (value === current.value) {
    close()
    return
  }

  try {
    await save({ [props.modelKey]: value })
    close()
  } catch (err) {
    error.value = err?.message ?? 'Не удалось сохранить'
  }
}

async function revert() {
  try {
    await reset(props.modelKey)
    close()
  } catch (err) {
    error.value = err?.message ?? 'Не удалось вернуть исходный текст'
  }
}

defineExpose({ open })
</script>

<template>
  <Popover ref="popover" append-to="body" @show="focusInput">
    <div class="edit-pop">
      <p class="edit-pop__label">{{ label }}</p>

      <Textarea
        v-if="multiline"
        ref="inputRef"
        v-model="draft"
        rows="4"
        :maxlength="maxlength"
        :placeholder="placeholder || 'Текст'"
        class="edit-pop__input"
      />
      <InputText
        v-else
        ref="inputRef"
        v-model="draft"
        :maxlength="maxlength"
        :placeholder="placeholder || 'Текст'"
        class="edit-pop__input"
        @keyup.enter="submit"
      />

      <div class="edit-pop__meta">
        <small class="muted">{{ draft.length }} / {{ maxlength }}</small>
        <small v-if="hasOwnValue" class="muted">своё значение</small>
      </div>

      <small v-if="error" class="edit-pop__error">{{ error }}</small>

      <div class="edit-pop__actions">
        <Button
          label="Как было"
          icon="pi pi-undo"
          text
          size="small"
          severity="secondary"
          :disabled="!hasOwnValue || saving"
          v-tooltip.top="'Вернуть текст по умолчанию'"
          @click="revert"
        />
        <span class="edit-pop__spacer" />
        <Button label="Отмена" text size="small" severity="secondary" @click="close" />
        <Button
          label="Сохранить"
          icon="pi pi-check"
          size="small"
          :loading="saving"
          @click="submit"
        />
      </div>
    </div>
  </Popover>
</template>

<style scoped>
.edit-pop {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(340px, 84vw);
  padding: 4px;
}

.edit-pop__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.edit-pop__input {
  width: 100%;
}

.edit-pop__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.72rem;
}

.edit-pop__error {
  color: #ef5b5b;
  font-size: 0.78rem;
}

.edit-pop__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.edit-pop__spacer {
  flex: 1;
}
</style>
