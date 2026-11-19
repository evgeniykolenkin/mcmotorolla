<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import { useSiteContent } from '../composables/useSiteContent'
import { BG_POSITIONS, getByPath, normalizeBgPosition } from '../config/content'
import { compressImage, formatBytes } from '../utils/image'
import { isUploadAvailable, removeImage, uploadImage } from '../services/mediaRepo'

/**
 * Один диалог на все картинки сайта: аватарка и фон главной.
 *
 * Файл сжимается в браузере (canvas → WebP), поэтому с телефона уходит
 * ~200 КБ вместо 4 МБ. Старый файл удаляется из Storage при замене.
 */
const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  modelKey: { type: String, required: true },
  title: { type: String, default: 'Картинка' },
  hint: { type: String, default: '' },
  folder: { type: String, default: 'hero' },
  maxWidth: { type: Number, default: 1920 },
  maxHeight: { type: Number, default: 1920 },
  quality: { type: Number, default: 0.82 },
  shape: { type: String, default: 'wide' },
  // Ключ настройки, куда писать положение картинки (например 'hero.bgPosition').
  // Если не передан — контрол не показывается (аватарке он не нужен).
  positionKey: { type: String, default: '' }
})
const emit = defineEmits(['saved'])

const { content, save, saving } = useSiteContent()

const fileInput = ref(null)
const busy = ref(false)
const error = ref('')
const picked = ref(null)
const urlDraft = ref('')

// Положение картинки в превью должно меняться мгновенно, не дожидаясь ответа
// Supabase: иначе кажется, что сегменты ничего не делают. Локальное значение
// перекрывает сохранённое и сбрасывается при открытии окна.
const localPosition = ref('')
let positionRequest = 0

const currentUrl = computed(() => getByPath(content.value, props.modelKey) ?? '')
const previewUrl = computed(() => picked.value?.url || urlDraft.value.trim() || currentUrl.value)
const busyAll = computed(() => busy.value || saving.value)

const positionOptions = BG_POSITIONS
const currentPosition = computed(() => {
  if (!props.positionKey) return 'center'
  if (localPosition.value) return localPosition.value
  return normalizeBgPosition(getByPath(content.value, props.positionKey))
})
const showPosition = computed(() => Boolean(props.positionKey) && Boolean(previewUrl.value))

watch(visible, (open) => {
  if (open) {
    error.value = ''
    urlDraft.value = ''
    localPosition.value = ''
  } else {
    revokePicked()
  }
})

function revokePicked() {
  if (picked.value?.url) URL.revokeObjectURL(picked.value.url)
  picked.value = null
}

onBeforeUnmount(revokePicked)

function pickFile() {
  fileInput.value?.click()
}

async function onFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  error.value = ''
  busy.value = true
  try {
    const blob = await compressImage(file, {
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
      quality: props.quality
    })
    revokePicked()
    picked.value = { blob, url: URL.createObjectURL(blob), size: blob.size }
    urlDraft.value = ''
  } catch (err) {
    error.value = err?.message ?? 'Не удалось подготовить картинку'
  } finally {
    busy.value = false
  }
}

async function applyValue(url) {
  const previous = currentUrl.value

  busy.value = true
  error.value = ''
  try {
    await save({ [props.modelKey]: url })
    if (previous && previous !== url) void removeImage(previous)
    emit('saved', url)
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось сохранить картинку'
  } finally {
    busy.value = false
  }
}

async function savePicked() {
  if (!picked.value) return

  const previous = currentUrl.value
  busy.value = true
  error.value = ''
  try {
    const { url } = await uploadImage(picked.value.blob, props.folder)
    await save({ [props.modelKey]: url })
    if (previous && previous !== url) void removeImage(previous)
    emit('saved', url)
    visible.value = false
  } catch (err) {
    error.value = err?.message ?? 'Не удалось загрузить картинку'
  } finally {
    busy.value = false
  }
}

function saveUrl() {
  const url = urlDraft.value.trim()
  if (!url) {
    error.value = 'Вставьте ссылку на картинку'
    return
  }

  applyValue(url)
}

function clearImage() {
  applyValue('')
}

/**
 * Положение сохраняем сразу: картинка не перезагружается, меняется только object-position.
 * Превью обновляется мгновенно, запрос уходит в фон; при ошибке откатываемся назад.
 */
async function savePosition(position) {
  if (!props.positionKey || !position || position === currentPosition.value) return

  const previous = currentPosition.value
  const request = ++positionRequest
  localPosition.value = position
  error.value = ''
  try {
    await save({ [props.positionKey]: position })
    emit('saved', position)
  } catch (err) {
    if (request === positionRequest) localPosition.value = previous
    error.value = err?.message ?? 'Не удалось сохранить положение картинки'
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="title"
    modal
    :draggable="false"
    :dismissable-mask="!busyAll"
    class="image-edit-dialog"
    :style="{ width: 'min(560px, 94vw)' }"
  >
    <div class="image-edit">
      <div
        class="image-edit__preview"
        :class="[`image-edit__preview--${shape}`, { 'image-edit__preview--empty': !previewUrl }]"
      >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt=""
          class="image-edit__image"
          :style="props.positionKey ? { objectPosition: currentPosition } : undefined"
        />
        <span v-else class="muted">Картинки пока нет</span>
      </div>

      <div v-if="showPosition" class="image-edit__position">
        <span class="image-edit__label">Положение</span>
        <SelectButton
          :model-value="currentPosition"
          :options="positionOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
          :disabled="busy"
          aria-label="Положение картинки"
          @update:model-value="savePosition"
        />
      </div>

      <p v-if="showPosition" class="image-edit__hint muted">
        Превью в пропорциях главной: видно, какой кусок кадра останется на экране.
        Положение сохраняется сразу, кнопка «Сохранить» не нужна.
      </p>

      <p v-if="hint" class="image-edit__hint muted">{{ hint }}</p>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="image-edit__file"
        @change="onFileChange"
      />

      <div class="image-edit__row">
        <Button
          :label="picked ? 'Выбрать другое' : 'Выбрать файл'"
          icon="pi pi-upload"
          outlined
          :disabled="busyAll || !isUploadAvailable"
          @click="pickFile"
        />
        <Button
          v-if="picked"
          label="Загрузить и сохранить"
          icon="pi pi-check"
          :loading="busyAll"
          @click="savePicked"
        />
        <small v-if="picked" class="muted">{{ formatBytes(picked.size) }}</small>
      </div>

      <p v-if="!isUploadAvailable" class="image-edit__note">
        Локальный режим: файлы не загружаются. Вставьте ссылку на картинку ниже.
      </p>

      <div class="image-edit__url">
        <label class="image-edit__label" for="image-edit-url">Или ссылка на картинку</label>
        <div class="image-edit__row">
          <InputText
            id="image-edit-url"
            v-model="urlDraft"
            placeholder="https://…"
            class="image-edit__url-input"
            @keyup.enter="saveUrl"
          />
          <Button label="Сохранить" :disabled="busyAll || !urlDraft.trim()" @click="saveUrl" />
        </div>
      </div>

      <small v-if="error" class="image-edit__error">{{ error }}</small>

      <div class="image-edit__actions">
        <Button
          v-if="currentUrl"
          label="Убрать картинку"
          icon="pi pi-trash"
          text
          severity="danger"
          :disabled="busyAll"
          @click="clearImage"
        />
        <span class="spacer" />
        <Button label="Закрыть" text severity="secondary" @click="visible = false" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.image-edit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.image-edit__preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-surface-2);
  font-size: 0.85rem;
}

.image-edit__preview--wide {
  /* Ближе к реальному герою на главной (≈2.7–3:1), иначе превью врёт об обрезке */
  aspect-ratio: 21 / 8;
  border-radius: 16px;
}

.image-edit__preview--circle {
  width: 148px;
  height: 148px;
  border-radius: 34%;
  align-self: center;
}

.image-edit__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-edit__hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.4;
}

.image-edit__position {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.image-edit__file {
  display: none;
}

.image-edit__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.image-edit__note {
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--app-accent-soft);
  font-size: 0.8rem;
}

.image-edit__url {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-edit__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--app-text-muted);
}

.image-edit__url-input {
  flex: 1;
  min-width: 180px;
}

.image-edit__error {
  color: #ef5b5b;
  font-size: 0.82rem;
}

.image-edit__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
