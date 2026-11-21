<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useSiteContent } from '../composables/useSiteContent'
import {
  BUTTON_COLORS,
  BUTTON_ICONS,
  MAX_EXTRA_BUTTONS,
  buttonAppearance,
  normalizeButtonColor,
  normalizeUrl
} from '../config/content'

/**
 * Редактор одной кнопки в главной секции: подпись, ссылка, иконка и цвет.
 *
 * kind = 'primary' | 'secondary' — первые две кнопки (хранятся отдельными
 * ключами), kind = 'extra' — добавленные владельцем (JSON-массив в настройке
 * hero.extraButtons). Для владельца все кнопки равны: любую можно изменить
 * или удалить.
 */
const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  kind: { type: String, default: 'extra' },
  // Индекс добавленной кнопки; -1 — создаём новую
  index: { type: Number, default: -1 },
  // Текущие значения открываемой кнопки ({ label, url, icon, color }) или null
  button: { type: Object, default: null }
})
const emit = defineEmits(['saved', 'removed'])

const { content, save, saving } = useSiteContent()

const draft = reactive({ label: '', url: '', icon: 'pi pi-link', color: 'accent' })
const error = ref('')

const isBase = computed(() => props.kind === 'primary' || props.kind === 'secondary')
const isEditing = computed(() => Boolean(props.button))
const defaultColor = computed(() => {
  if (props.kind === 'primary') return 'accent'
  if (props.kind === 'secondary') return 'outline'
  return 'accent'
})
const previewAppearance = computed(() => buttonAppearance(draft.color))
const heading = computed(() => (isEditing.value ? 'Изменить кнопку' : 'Новая кнопка'))
const baseKeys = computed(() => [
  `hero.${props.kind}Label`,
  `hero.${props.kind}Url`,
  `hero.${props.kind}Icon`,
  `hero.${props.kind}Color`
])
const canDelete = computed(() => isBase.value || (props.kind === 'extra' && props.index >= 0))
// Больше четырёх добавленных кнопок не нужно: hero и так широкий
const limitReached = computed(
  () => !isBase.value && !isEditing.value && content.value.hero.extraButtons.length >= MAX_EXTRA_BUTTONS
)
const previewLabel = computed(() => draft.label.trim() || 'Подпись кнопки')

function isValidIcon(icon) {
  return BUTTON_ICONS.some((option) => option.value === icon)
}

function iconLabel(icon) {
  return BUTTON_ICONS.find((option) => option.value === icon)?.label ?? ''
}

function colorLabel(color) {
  return BUTTON_COLORS.find((option) => option.value === color)?.label ?? ''
}

function colorSwatch(color) {
  return BUTTON_COLORS.find((option) => option.value === color)?.swatch ?? '#9146ff'
}

function loadDraft() {
  error.value = ''
  draft.label = props.button?.label ?? ''
  draft.url = props.button?.url ?? ''
  draft.icon = isValidIcon(props.button?.icon) ? props.button.icon : 'pi pi-link'
  draft.color = normalizeButtonColor(props.button?.color, defaultColor.value)
}

watch(visible, (open) => {
  if (open) loadDraft()
})

async function submit() {
  const label = draft.label.trim()
  const url = normalizeUrl(draft.url.trim())
  error.value = ''

  if (!label) {
    error.value = 'Впиши подпись кнопки'
    return
  }
  if (!url) {
    error.value = 'Ссылка должна начинаться с http:// или https://'
    return
  }
  if (limitReached.value) {
    error.value = `Больше ${MAX_EXTRA_BUTTONS} добавленных кнопок нельзя`
    return
  }

  const icon = isValidIcon(draft.icon) ? draft.icon : 'pi pi-link'
  const color = normalizeButtonColor(draft.color, defaultColor.value)

  try {
    if (isBase.value) {
      const [labelKey, urlKey, iconKey, colorKey] = baseKeys.value
      await save({ [labelKey]: label, [urlKey]: url, [iconKey]: icon, [colorKey]: color })
    } else {
      const list = [...content.value.hero.extraButtons]
      const payload = { label, url, icon, color }
      if (props.index >= 0 && props.index < list.length) list[props.index] = payload
      else list.push(payload)
      await save({ 'hero.extraButtons': list })
    }

    emit('saved', label)
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось сохранить кнопку'
  }
}

async function remove() {
  if (!canDelete.value) return

  error.value = ''
  try {
    if (isBase.value) {
      // Пустая ссылка убирает кнопку с главной и не возвращает дефолт из кода
      const [, urlKey] = baseKeys.value
      await save({ [urlKey]: '' })
    } else {
      const list = [...content.value.hero.extraButtons]
      list.splice(props.index, 1)
      await save({ 'hero.extraButtons': list })
    }
    emit('removed', draft.label)
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось удалить кнопку'
  }
}
</script>
<template>
  <Dialog
    v-model:visible="visible"
    :header="heading"
    modal
    :draggable="false"
    :dismissable-mask="!saving"
    class="hero-btn-dialog"
    :style="{ width: 'min(480px, 94vw)' }"
  >
    <div class="hero-btn">
      <div class="hero-btn__field">
        <label class="hero-btn__label" for="hero-btn-label">Подпись</label>
        <InputText
          id="hero-btn-label"
          v-model="draft.label"
          maxlength="40"
          placeholder="Например, Boosty"
          autocomplete="off"
          @keyup.enter="submit"
        />
      </div>

      <div class="hero-btn__field">
        <label class="hero-btn__label" for="hero-btn-url">Ссылка</label>
        <InputText
          id="hero-btn-url"
          v-model="draft.url"
          placeholder="https://boosty.to/…"
          autocomplete="off"
          @keyup.enter="submit"
        />
        <small class="muted">
          Открывается в новой вкладке. Без http(s) кнопку не сохранить.
        </small>
      </div>

      <div class="hero-btn__field">
        <label class="hero-btn__label" for="hero-btn-icon">Иконка</label>
        <Select
          id="hero-btn-icon"
          v-model="draft.icon"
          :options="BUTTON_ICONS"
          option-label="label"
          option-value="value"
          append-to="body"
        >
          <template #value="slotProps">
            <span class="hero-btn__icon-option">
              <i :class="slotProps.value" />
              {{ iconLabel(slotProps.value) }}
            </span>
          </template>
          <template #option="slotProps">
            <span class="hero-btn__icon-option">
              <i :class="slotProps.option.value" />
              {{ slotProps.option.label }}
            </span>
          </template>
        </Select>
      </div>

      <div class="hero-btn__field">
        <label class="hero-btn__label" for="hero-btn-color">Цвет</label>
        <Select
          id="hero-btn-color"
          v-model="draft.color"
          :options="BUTTON_COLORS"
          option-label="label"
          option-value="value"
          append-to="body"
        >
          <template #value="slotProps">
            <span class="hero-btn__color-option">
              <span
                class="hero-btn__color-swatch"
                :style="{ background: colorSwatch(slotProps.value) }"
                aria-hidden="true"
              />
              {{ colorLabel(slotProps.value) }}
            </span>
          </template>
          <template #option="slotProps">
            <span class="hero-btn__color-option">
              <span
                class="hero-btn__color-swatch"
                :style="{ background: slotProps.option.swatch }"
                aria-hidden="true"
              />
              {{ slotProps.option.label }}
            </span>
          </template>
        </Select>
        <small class="muted">
          Цвет заливки кнопки. «Прозрачный» оставит только рамку.
        </small>
      </div>

      <div class="hero-btn__preview">
        <span class="hero-btn__label">Так будет выглядеть</span>
        <Button
          :label="previewLabel"
          :icon="draft.icon"
          :outlined="previewAppearance.outlined"
          :severity="previewAppearance.severity"
          class="hero-btn__preview-button"
        />
      </div>

      <small v-if="error" class="hero-btn__error">{{ error }}</small>
      <small v-if="limitReached" class="muted">
        Уже добавлено {{ MAX_EXTRA_BUTTONS }} кнопки — удали лишнюю, чтобы добавить новую.
      </small>

      <div class="hero-btn__actions">
        <Button
          v-if="canDelete"
          label="Удалить"
          icon="pi pi-trash"
          text
          severity="danger"
          :disabled="saving"
          @click="remove"
        />
        <span class="spacer" />
        <Button label="Отмена" text severity="secondary" :disabled="saving" @click="visible = false" />
        <Button label="Сохранить" :loading="saving" :disabled="limitReached" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.hero-btn {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-btn__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-btn__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.hero-btn__icon-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.hero-btn__color-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.hero-btn__color-swatch {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.hero-btn__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-2);
}

.hero-btn__preview-button {
  align-self: flex-start;
}

.hero-btn__error {
  color: #ef5b5b;
  font-size: 0.82rem;
}

.hero-btn__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>

