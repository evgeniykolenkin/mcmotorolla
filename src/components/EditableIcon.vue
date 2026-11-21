<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { useAuth } from '../composables/useAuth'
import { useSiteContent } from '../composables/useSiteContent'
import { EYEBROW_ICONS, getByPath } from '../config/content'

/**
 * Иконка + карандашик (виден только владельцу).
 * Карандашик открывает маленькое окно с набором декоративных PrimeIcons —
 * как в HeroButtonDialog, только без подписи и ссылки.
 */
const props = defineProps({
  modelKey: { type: String, required: true },
  label: { type: String, default: 'Иконка' },
  // Текст рядом с иконкой в предпросмотре, чтобы видеть пару целиком
  previewText: { type: String, default: '' }
})

const { isOwner } = useAuth()
const { content, overrides, save, reset, saving } = useSiteContent()

const visible = ref(false)
const draft = ref('')
const error = ref('')

const current = computed(() => getByPath(content.value, props.modelKey) ?? '')
const hasOwnValue = computed(() =>
  Object.prototype.hasOwnProperty.call(overrides.value, props.modelKey)
)

function iconLabel(icon) {
  return EYEBROW_ICONS.find((option) => option.value === icon)?.label ?? ''
}

function open() {
  draft.value = current.value
  error.value = ''
  visible.value = true
}

async function submit() {
  if (draft.value === current.value) {
    visible.value = false
    return
  }

  try {
    await save({ [props.modelKey]: draft.value })
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось сохранить иконку'
  }
}

async function revert() {
  try {
    await reset(props.modelKey)
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось вернуть исходную иконку'
  }
}
</script>

<template>
  <span class="editable-icon">
    <i :class="current" class="editable-icon__glyph" />
    <Button
      v-if="isOwner"
      v-tooltip.top="'Изменить иконку'"
      icon="pi pi-pencil"
      text
      rounded
      size="small"
      severity="secondary"
      class="editable-icon__pencil"
      :aria-label="`Изменить: ${label}`"
      @click.stop.prevent="open"
    />

    <Dialog
      v-if="isOwner"
      v-model:visible="visible"
      :header="label"
      modal
      :draggable="false"
      :dismissable-mask="!saving"
      class="icon-dialog"
      :style="{ width: 'min(400px, 94vw)' }"
    >
      <div class="icon-dialog__body">
        <div class="icon-dialog__field">
          <span class="icon-dialog__label">Иконка</span>

          <Select
            v-model="draft"
            :options="EYEBROW_ICONS"
            option-label="label"
            option-value="value"
            append-to="body"
            :aria-label="label"
          >
            <template #value="slotProps">
              <span class="icon-dialog__option">
                <i :class="slotProps.value" />
                {{ iconLabel(slotProps.value) }}
              </span>
            </template>
            <template #option="slotProps">
              <span class="icon-dialog__option">
                <i :class="slotProps.option.value" />
                {{ slotProps.option.label }}
              </span>
            </template>
          </Select>
        </div>

        <div v-if="previewText" class="icon-dialog__preview">
          <span class="icon-dialog__label">Так будет выглядеть</span>
          <p class="icon-dialog__eyebrow">
            <i :class="draft" />
            <span>{{ previewText }}</span>
          </p>
        </div>

        <small v-if="error" class="icon-dialog__error">{{ error }}</small>

        <div class="icon-dialog__actions">
          <Button
            label="Как было"
            icon="pi pi-undo"
            text
            size="small"
            severity="secondary"
            :disabled="!hasOwnValue || saving"
            v-tooltip.top="'Вернуть иконку по умолчанию'"
            @click="revert"
          />
          <span class="spacer" />
          <Button
            label="Отмена"
            text
            size="small"
            severity="secondary"
            :disabled="saving"
            @click="visible = false"
          />
          <Button
            label="Сохранить"
            icon="pi pi-check"
            size="small"
            :loading="saving"
            @click="submit"
          />
        </div>
      </div>
    </Dialog>
  </span>
</template>

<style scoped>
.editable-icon {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  line-height: 1;
}

.editable-icon__glyph {
  line-height: 1;
}

/* Карандаш повторяет поведение карандаша у текста: тихий, громче — на hover */
.editable-icon__pencil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  padding: 0;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.editable-icon:hover .editable-icon__pencil,
.editable-icon__pencil:focus-visible {
  opacity: 1;
}

.icon-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.icon-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.icon-dialog__label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.icon-dialog__option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.icon-dialog__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-2);
}

/* Мини-копия надписи главной: видно, как иконка смотрится с текстом */
.icon-dialog__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-accent);
}

.icon-dialog__error {
  color: #ef5b5b;
  font-size: 0.78rem;
}

.icon-dialog__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 560px) {
  .editable-icon__pencil {
    opacity: 0.8;
    width: 24px;
    height: 24px;
  }
}
</style>
