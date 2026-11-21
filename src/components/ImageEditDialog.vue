<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
// Одна кнопка «Сохранить»: активна, когда есть файл или вставлена ссылка
const canSave = computed(() => Boolean(picked.value) || Boolean(urlDraft.value.trim()))

const positionOptions = BG_POSITIONS
const currentPosition = computed(() => {
  if (!props.positionKey) return '50% 50%'
  if (localPosition.value) return localPosition.value
  return normalizeBgPosition(getByPath(content.value, props.positionKey))
})
const showPosition = computed(() => Boolean(props.positionKey) && Boolean(previewUrl.value))

/*
 * Рамка на «всей картинке»: показывает, какой кусок кадра останется на главной.
 * Размеры считаем в пикселях по реально отрисованной картинке (object-fit:
 * contain оставляет поля), чтобы рамка совпадала с превью сверху.
 */
const CROP_RATIO = 21 / 8

const cropBox = ref(null)
const cropImage = ref(null)
const cropFrame = ref(null)
const cropGeometry = ref(null)
const cropError = ref(false)
const dragging = ref(false)
let cropObserver = null
let dragState = null

const positionParts = computed(() => {
  const match = currentPosition.value.match(/(\d{1,3})%\s+(\d{1,3})%/)
  if (!match) return { x: 50, y: 50 }
  return { x: Number(match[1]), y: Number(match[2]) }
})

// Cover обрезает только по одной оси — по ней рамка и двигается
const cropAxis = computed(() => {
  const geometry = cropGeometry.value
  if (!geometry) return ''
  if (geometry.rangeX > 0.5) return 'x'
  if (geometry.rangeY > 0.5) return 'y'
  return ''
})

const cropPercent = computed(() => Math.round(positionParts.value[cropAxis.value || 'y']))

const frameStyle = computed(() => {
  const geometry = cropGeometry.value
  if (!geometry) return { display: 'none' }

  const { x, y } = positionParts.value
  return {
    width: `${geometry.cropW}px`,
    height: `${geometry.cropH}px`,
    left: `${geometry.offsetX + (geometry.pictureW - geometry.cropW) * (x / 100)}px`,
    top: `${geometry.offsetY + (geometry.pictureH - geometry.cropH) * (y / 100)}px`
  }
})

const cropHint = computed(() => {
  if (cropError.value) return 'Не удалось загрузить картинку — проверьте ссылку.'
  if (!cropGeometry.value) return 'Считаем пропорции картинки…'
  if (cropAxis.value === 'x') {
    return 'Кадр главной обрезает картинку по горизонтали: тяните рамку влево и вправо.'
  }
  if (cropAxis.value === 'y') {
    return 'Кадр главной обрезает картинку по вертикали: тяните рамку вверх и вниз.'
  }
  return 'Пропорции картинки почти совпадают с кадром — кадрировать почти нечего.'
})

/** Пересчёт рамки под текущий размер блока и натуральные пропорции картинки. */
function measureCrop() {
  const image = cropImage.value
  if (!image || !image.naturalWidth || !image.naturalHeight) return

  // offsetWidth/offsetHeight — размеры вёрстки: они не зависят от transform, а диалог
  // при открытии масштабируется анимацией PrimeVue (scale .93). С getBoundingClientRect
  // рамка замерялась в сжатом окне и оставалась меньше и левее нужного места.
  const width = image.offsetWidth
  const height = image.offsetHeight
  if (!width || !height) return

  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const pictureW = image.naturalWidth * scale
  const pictureH = image.naturalHeight * scale

  // Рамка всегда в пропорциях героя: одна сторона картинки остаётся целиком
  const cropW = Math.min(pictureW, pictureH * CROP_RATIO)
  const cropH = cropW / CROP_RATIO

  cropGeometry.value = {
    pictureW,
    pictureH,
    cropW,
    cropH,
    offsetX: (width - pictureW) / 2,
    offsetY: (height - pictureH) / 2,
    rangeX: pictureW - cropW,
    rangeY: pictureH - cropH
  }
}

function onCropImageLoad() {
  cropError.value = false
  measureCrop()
}

function onCropImageError() {
  cropError.value = true
  cropGeometry.value = null
}

function onFramePointerDown(event) {
  if (!cropAxis.value || busy.value) return

  event.preventDefault()
  // Незавершённое сохранение пресета не должно откатывать начатое перетаскивание
  positionRequest += 1
  try {
    cropFrame.value?.setPointerCapture?.(event.pointerId)
  } catch {
    // синтетические события без активного указателя — просто тянем без capture
  }
  dragState = {
    pointerId: event.pointerId,
    axis: cropAxis.value,
    startX: event.clientX,
    startY: event.clientY,
    start: { ...positionParts.value },
    value: currentPosition.value
  }
  dragging.value = true
}

function onFramePointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId || !cropGeometry.value) return

  const { axis, start } = dragState
  const geometry = cropGeometry.value
  const range = axis === 'x' ? geometry.rangeX : geometry.rangeY
  if (range <= 0.5) return

  const delta = axis === 'x' ? event.clientX - dragState.startX : event.clientY - dragState.startY
  const value = Math.min(100, Math.max(0, Math.round(start[axis] + (delta / range) * 100)))
  localPosition.value = axis === 'x'
    ? `${value}% ${start.y}%`
    : `${start.x}% ${value}%`
}

function onFramePointerUp(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return

  const previous = dragState.value
  const next = currentPosition.value
  dragState = null
  dragging.value = false

  if (next !== previous) persistPosition(next)
}

/** Рамка — тоже слайдер: стрелки двигают её с клавиатуры. */
function onFrameKeydown(event) {
  const axis = cropAxis.value
  const geometry = cropGeometry.value
  if (!axis || !geometry) return

  const direction =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
  if (!direction) return

  event.preventDefault()
  const start = positionParts.value
  // Шаг в процентах, а не в пикселях: shift — быстрый шаг
  const step = event.shiftKey ? 20 : 5
  const value = Math.min(100, Math.max(0, start[axis] + direction * step))
  const next = axis === 'x' ? `${value}% ${start.y}%` : `${start.x}% ${value}%`

  if (next !== currentPosition.value) persistPosition(next)
}

watch(cropBox, (element) => {
  cropObserver?.disconnect()
  if (!element || typeof ResizeObserver !== 'function') return

  cropObserver = new ResizeObserver(measureCrop)
  cropObserver.observe(element)
})

watch(previewUrl, () => {
  cropGeometry.value = null
  cropError.value = false
  nextTick(measureCrop)
})

watch(visible, (open) => {
  if (open) {
    error.value = ''
    urlDraft.value = ''
    localPosition.value = ''
    cropGeometry.value = null
    nextTick(measureCrop)
  } else {
    revokePicked()
  }
})

function revokePicked() {
  if (picked.value?.url) URL.revokeObjectURL(picked.value.url)
  picked.value = null
}

onBeforeUnmount(() => {
  cropObserver?.disconnect()
  revokePicked()
})

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

/**
 * Технические ответы Supabase (RLS, протухшая сессия) владельцу ничего не говорят:
 * заменяем их на понятное действие. Остальные ошибки показываем как есть.
 */
function describeError(err, fallback) {
  const message = String(err?.message ?? '')
  if (/permission denied|row-level security|jwt|not authenticated/i.test(message)) {
    return 'Нет прав на сохранение — войдите как владелец.'
  }
  return message || fallback
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
    error.value = describeError(err, 'Не удалось сохранить картинку')
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
    error.value = describeError(err, 'Не удалось загрузить картинку')
  } finally {
    busy.value = false
  }
}

/**
 * Единственная кнопка сохранения: файл важнее ссылки. Если файла нет —
 * сохраняем вставленную ссылку (в локальном режиме это единственный путь).
 */
function saveImage() {
  if (busyAll.value) return
  if (picked.value) {
    void savePicked()
    return
  }

  const url = urlDraft.value.trim()
  if (url) void applyValue(url)
}

function clearImage() {
  applyValue('')
}

/**
 * Положение сохраняем сразу: картинка не перезагружается, меняется только object-position.
 * Превью обновляется мгновенно, запрос уходит в фон; при ошибке показываем сохранённое значение.
 */
async function persistPosition(position) {
  if (!props.positionKey || !position) return

  const request = ++positionRequest
  localPosition.value = position
  error.value = ''
  try {
    await save({ [props.positionKey]: position })
    emit('saved', position)
  } catch (err) {
    if (request === positionRequest) localPosition.value = ''
    error.value = describeError(err, 'Не удалось сохранить положение картинки')
  }
}

function savePosition(position) {
  if (!props.positionKey || !position || position === currentPosition.value) return
  void persistPosition(position)
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
        v-if="!showPosition"
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

      <div v-if="showPosition" class="image-edit__crop">
        <span class="image-edit__label">Вся картинка</span>
        <div ref="cropBox" class="image-edit__crop-box">
          <img
            ref="cropImage"
            :src="previewUrl"
            alt=""
            class="image-edit__crop-image"
            @load="onCropImageLoad"
            @error="onCropImageError"
          />
          <span
            ref="cropFrame"
            class="image-edit__crop-frame"
            :class="{ 'image-edit__crop-frame--dragging': dragging }"
            :style="frameStyle"
            role="slider"
            tabindex="0"
            aria-label="Видимая часть фона"
            :aria-valuenow="cropPercent"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-orientation="cropAxis === 'x' ? 'horizontal' : 'vertical'"
            @pointerdown="onFramePointerDown"
            @pointermove="onFramePointerMove"
            @pointerup="onFramePointerUp"
            @pointercancel="onFramePointerUp"
            @keydown="onFrameKeydown"
          />
        </div>
        <p class="image-edit__hint muted">{{ cropHint }}</p>
      </div>

      <p v-if="showPosition" class="image-edit__hint muted">
        Положение сохраняется сразу — отдельная кнопка для него не нужна.
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
          v-if="canSave"
          label="Сохранить"
          icon="pi pi-check"
          :loading="busyAll"
          :disabled="busyAll"
          @click="saveImage"
        />
        <small v-if="picked" class="muted">{{ formatBytes(picked.size) }}</small>
      </div>

      <p v-if="!isUploadAvailable" class="image-edit__note">
        Локальный режим: файлы не загружаются. Вставьте ссылку на картинку ниже.
      </p>

      <div class="image-edit__url">
        <label class="image-edit__label" for="image-edit-url">Или ссылка на картинку</label>
        <InputText
          id="image-edit-url"
          v-model="urlDraft"
          placeholder="https://…"
          class="image-edit__url-input"
          @keyup.enter="saveImage"
        />
        <small class="image-edit__hint muted">
          Вставьте ссылку и нажмите «Сохранить». Файл важнее ссылки.
        </small>
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

.image-edit__crop {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-edit__crop-box {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: var(--app-surface-2);
  box-shadow: inset 0 0 0 1px var(--app-border);
}

.image-edit__crop-image {
  display: block;
  /* Картинка во всю ширину панели: рамка кадра совпадает с краями, без полей по бокам */
  width: 100%;
  height: auto;
  /* Высокие фото не раздувают диалог — для них остаются поля, но рамка по центру */
  max-height: 320px;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

/* Рамка кадра главной: затемнение вокруг — box-shadow, без лишних слоёв разметки */
.image-edit__crop-frame {
  position: absolute;
  display: block;
  box-sizing: border-box;
  border: 2px solid var(--app-accent);
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(8, 6, 16, 0.62);
  cursor: grab;
  touch-action: none;
  outline: none;
}

.image-edit__crop-frame:focus-visible {
  border-color: #fff;
}

.image-edit__crop-frame--dragging {
  cursor: grabbing;
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
  width: 100%;
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

/* На узком экране диалог не должен раздуваться: картинке хватает 190px по высоте */
@media (max-width: 420px) {
  .image-edit__crop-image {
    max-height: 190px;
  }
}
</style>
