<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useSiteContent } from '../composables/useSiteContent'
import { BUTTON_ICONS, MAX_EXTRA_BUTTONS, normalizeUrl } from '../config/content'

/**
 * Редактор одной кнопки в главной секции: подпись, ссылка, иконка.
 *
 * kind = 'primary' | 'secondary' — две базовые кнопки (ссылки по умолчанию
 * из src/config/site.js), kind = 'extra' — добавленные владельцем
 * (хранятся JSON-массивом в настройке hero.extraButtons).
 */
const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  kind: { type: String, default: 'extra' },
  // Индекс добавленной кнопки; -1 — создаём новую
  index: { type: Number, default: -1 },
  // Текущие значения открываемой кнопки ({ label, url, icon }) или null
  button: { type: Object, default: null }
})
const emit = defineEmits(['saved', 'removed', 'reverted'])

const { content, overrides, save, reset, saving } = useSiteContent()

const draft = reactive({ label: '', url: '', icon: 'pi pi-link' })
const error = ref('')

const isBase = computed(() => props.kind === 'primary' || props.kind === 'secondary')
const isEditing = computed(() => Boolean(props.button))
const heading = computed(() => {
  if (props.kind === 'primary') return 'Основная кнопка'
  if (props.kind === 'secondary') return 'Вторая кнопка'
  return isEditing.value ? 'Изменить кнопку' : 'Новая кнопка'
})
const baseKeys = computed(() => [
  `hero.${props.kind}Label`,
  `hero.${props.kind}Url`,
  `hero.${props.kind}Icon`
])
const hasOwnBase = computed(() => baseKeys.value.some((key) => key in overrides.value))
const canRevert = computed(() => isBase.value && hasOwnBase.value)
const canDelete = computed(() => props.kind === 'extra' && props.index >= 0)
// Больше четырёх добавленных кнопок не нужно: hero и так широкий
const limitReached = computed(
  () => !isBase.value && !isEditing.value && content.value.hero.extraButtons.length >= MAX_EXTRA_BUTTONS
)
const previewLabel = computed(() => draft.label.trim() || 'Подпись кнопки')
// Базовая кнопка без ссылки = скрыта с главной; в окне показываем это словами
const willHide = computed(() => isBase.value && !draft.url.trim())

function isValidIcon(icon) {
  return BUTTON_ICONS.some((option) => option.value === icon)
}

function iconLabel(icon) {
  return BUTTON_ICONS.find((option) => option.value === icon)?.label ?? ''
}

function loadDraft() {
  error.value = ''
  draft.label = props.button?.label ?? ''
  draft.url = props.button?.url ?? ''
  draft.icon = isValidIcon(props.button?.icon) ? props.button.icon : 'pi pi-link'
}

watch(visible, (open) => {
  if (open) loadDraft()
})

async function submit() {
  const label = draft.label.trim()
  const rawUrl = draft.url.trim()
  const url = normalizeUrl(rawUrl)
  error.value = ''

  if (isBase.value) {
    // Пустая ссылка — осознанное «скрыть кнопку», а вот мусор в поле не пускаем
    if (rawUrl && !url) {
      error.value = 'Ссылка должна начинаться с http:// или https://'
      return
    }
  } else {
    if (!label) {
      error.value = 'Впиши подпись кнопки'
      return
    }
    if (!url) {
      error.value = 'Ссылка должна начинаться с http:// или https://'
      return
    }
  }
  if (limitReached.value) {
    error.value = `Больше ${MAX_EXTRA_BUTTONS} добавленных кнопок нельзя`
    return
  }

  const icon = isValidIcon(draft.icon) ? draft.icon : 'pi pi-link'

  try {
    if (isBase.value) {
      const [labelKey, urlKey, iconKey] = baseKeys.value
      const patch = { [urlKey]: url, [iconKey]: icon }
      // Стёртая подпись не должна оставлять кнопку без текста — остаётся дефолт
      if (label) patch[labelKey] = label
      await save(patch)
    } else {
      const list = [...content.value.hero.extraButtons]
      const payload = { label, url, icon }
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
    const list = [...content.value.hero.extraButtons]
    list.splice(props.index, 1)
    await save({ 'hero.extraButtons': list })
    emit('removed', draft.label)
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось удалить кнопку'
  }
}

/** «Как было»: удаляем правки трёх ключей — вернётся кнопка из кода. */
async function revert() {
  if (!canRevert.value) return

  error.value = ''
  try {
    await reset(baseKeys.value)
    emit('reverted')
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось вернуть исходную кнопку'
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
          {{ isBase
            ? 'Открывается в новой вкладке. Оставь поле пустым, чтобы скрыть кнопку с главной.'
            : 'Открывается в новой вкладке. Без http(s) кнопку не сохранить.' }}
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

      <div class="hero-btn__preview">
        <span class="hero-btn__label">Так будет выглядеть</span>
        <Button
          v-if="!willHide"
          :label="previewLabel"
          :icon="draft.icon"
          :outlined="kind !== 'primary'"
          :severity="kind === 'primary' ? undefined : 'secondary'"
          class="hero-btn__preview-button"
        />
        <small v-else class="muted">
          Кнопки не будет на главной — вернуть её можно этим же окном.
        </small>
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
        <Button
          v-else-if="canRevert"
          label="Как было"
          icon="pi pi-undo"
          text
          severity="secondary"
          :disabled="saving"
          @click="revert"
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

