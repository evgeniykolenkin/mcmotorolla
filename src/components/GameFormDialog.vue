<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import AutoComplete from 'primevue/autocomplete'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import RatingInput from './RatingInput.vue'
import MarkdownText from './MarkdownText.vue'
import { useGames } from '../composables/useGames'
import { getSteamGame, searchSteamGames } from '../services/steamClient'
import { STATUS_OPTIONS, fromIsoDate, toIsoDate } from '../utils/format'

const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  game: { type: Object, default: null }
})
const emit = defineEmits(['saved'])

const { saveGame } = useGames()

const PLATFORM_OPTIONS = [
  'ПК',
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X/S',
  'Nintendo Switch',
  'Steam Deck',
  'Мобильные'
]

const emptyForm = () => ({
  id: null,
  title: '',
  coverUrl: '',
  platform: 'ПК',
  genre: '',
  rating: 8,
  hours: null,
  completedAt: new Date(),
  verdict: '',
  review: '',
  status: 'completed',
  published: true,
  releaseYear: null,
  steamAppId: null
})

const form = reactive(emptyForm())
const saving = ref(false)
const errors = reactive({ title: '', rating: '', releaseYear: '', general: '' })

// --- Markdown в поле «Как проходил» -----------------------------------------
const mdMode = ref('edit')
const mdHelpOpen = ref(false)
const MD_HELP = [
  { syntax: '# Заголовок', example: '# Заголовок', note: 'заголовок 1 уровня' },
  { syntax: '## Подзаголовок', example: '## Подзаголовок', note: 'заголовок 2 уровня' },
  { syntax: '### Мелкий', example: '### Мелкий заголовок', note: 'заголовок 3 уровня' },
  { syntax: '**жирный**', example: '**жирный**', note: 'жирный текст' },
  { syntax: '*курсив*', example: '*курсив*', note: 'курсив' },
  { syntax: '~~зачёркнутый~~', example: '~~зачёркнутый~~', note: 'зачёркивание' },
  { syntax: '++подчёркнутый++', example: '++подчёркнутый++', note: 'подчёркивание' },
  { syntax: '`код`', example: '`код`', note: 'код в строке' },
  { syntax: '- пункт', example: '- пункт\n- ещё пункт', note: 'маркированный список' },
  { syntax: '1. пункт', example: '1. первый\n2. второй', note: 'нумерованный список' },
  {
    syntax: '  - вложенный',
    example: '- пункт\n  - вложенный',
    note: 'вложенность — отступ в 2 пробела'
  },
  {
    syntax: '- [ ] дело',
    example: '- [ ] не пройдено\n- [x] пройдено',
    note: 'чек-лист: [ ] и [x]'
  },
  { syntax: '> цитата', example: '> цитата', note: 'цитата' },
  { syntax: '[текст](https://…)', example: '[текст](https://example.com)', note: 'ссылка' },
  {
    syntax: 'https://…',
    example: 'https://example.com',
    note: 'просто ссылка — станет кликабельной'
  },
  { syntax: '---', example: '---', note: 'разделитель' },
  { syntax: '\\*', example: '\\*не курсив\\*', note: 'показать символ без разметки' }
]

/** AutoComplete при выборе опции отдаёт объект — приводим к строке названия. */
const titleModel = computed({
  get: () => form.title,
  set: (value) => {
    form.title = typeof value === 'string' ? value : String(value?.name ?? '')
  }
})

// --- Автозаполнение из Steam -------------------------------------------------
const suggestions = ref([])
const steamBusy = ref(false)
const steamError = ref('')
const coverFailed = ref(false)
let searchController = null
let detailsController = null
let lastQuery = ''

/**
 * Панель подсказок рендерится в body, и без ограничения её ширину диктуют
 * длинные названия игр — она растягивается на весь экран. Поэтому меряем
 * ширину поля и отдаём её в overlayStyle: панель = инпут.
 */
const titleField = ref(null)
const titleOverlayStyle = ref({})
let titleWidthObserver = null

function measureTitleWidth() {
  // clientWidth — ширина раскладки: не зависит от анимации scale при открытии
  const width = titleField.value?.clientWidth ?? 0
  if (width > 0) titleOverlayStyle.value = { width: `${width}px` }
}

/** Диалог монтирует содержимое при открытии — измеряем после отрисовки. */
function startTitleWidthTracking() {
  nextTick(() => {
    measureTitleWidth()

    if (titleWidthObserver || !titleField.value || typeof ResizeObserver === 'undefined') return

    titleWidthObserver = new ResizeObserver(measureTitleWidth)
    titleWidthObserver.observe(titleField.value)
  })
}

function stopTitleWidthTracking() {
  titleWidthObserver?.disconnect()
  titleWidthObserver = null
}

onBeforeUnmount(stopTitleWidthTracking)

const isEdit = computed(() => Boolean(props.game?.id))
const dialogHeader = computed(() => (isEdit.value ? 'Редактировать игру' : 'Новая игра'))

function resetErrors() {
  Object.assign(errors, { title: '', rating: '', releaseYear: '', general: '' })
}

/** Поиск по мере ввода: min 2 символа, PrimeVue сам дебаунсит (delay=350). */
async function onSearchSteam(event) {
  const query = String(event?.query ?? '').trim()
  if (query.length < 2) {
    suggestions.value = []
    return
  }
  if (query === lastQuery) return
  lastQuery = query

  searchController?.abort()
  searchController = new AbortController()
  const controller = searchController

  try {
    const results = await searchSteamGames(query, { signal: controller.signal })
    if (!controller.signal.aborted) suggestions.value = results
  } catch (error) {
    if (error?.name === 'AbortError') return
    suggestions.value = []
    lastQuery = ''
    steamError.value = 'Steam не отвечает — заполните поля вручную'
  }
}

/** Выбор подсказки: подтягиваем обложку, жанр и год. Платформу не трогаем. */
async function onPickSteamGame(event) {
  const picked = event?.value
  if (!picked?.appId) return

  form.title = picked.name
  steamError.value = ''
  steamBusy.value = true

  detailsController?.abort()
  detailsController = new AbortController()
  const controller = detailsController

  try {
    const game = await getSteamGame(picked.appId, { signal: controller.signal })
    if (controller.signal.aborted) return

    form.coverUrl = game.coverUrl || ''
    if (game.genre) form.genre = game.genre
    if (game.releaseYear) form.releaseYear = game.releaseYear
    form.steamAppId = game.appId
    coverFailed.value = false
  } catch (error) {
    if (error?.name === 'AbortError') return
    steamError.value = 'Не удалось загрузить данные из Steam — заполните вручную'
  } finally {
    if (detailsController === controller) steamBusy.value = false
  }
}

function clearCover() {
  form.coverUrl = ''
  form.steamAppId = null
  coverFailed.value = false
}

function fillForm() {
  resetErrors()
  suggestions.value = []
  steamError.value = ''
  coverFailed.value = false
  lastQuery = ''
  mdMode.value = 'edit'
  mdHelpOpen.value = false

  if (!props.game) {
    Object.assign(form, emptyForm())
    return
  }

  Object.assign(form, {
    ...props.game,
    verdict: props.game.verdict ?? '',
    review: props.game.review ?? '',
    hours: props.game.hours ?? null,
    coverUrl: props.game.coverUrl && props.game.coverUrl !== 'null' ? props.game.coverUrl : '',
    releaseYear: props.game.releaseYear ?? null,
    steamAppId: props.game.steamAppId ?? null,
    completedAt: fromIsoDate(props.game.completedAt)
  })
}

watch(visible, (open) => {
  if (open) fillForm()
})

watch(
  () => props.game,
  () => {
    if (visible.value) fillForm()
  }
)

function validate() {
  resetErrors()

  if (form.title.trim().length < 2) errors.title = 'Название — минимум 2 символа'

  const rating = Number(form.rating)
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    errors.rating = 'Оценка должна быть от 1 до 10'
  }

  if (form.releaseYear !== null && form.releaseYear !== undefined && form.releaseYear !== '') {
    const year = Number(form.releaseYear)
    if (!Number.isFinite(year) || year < 1950 || year > 2100) {
      errors.releaseYear = 'Год — от 1950 до 2100'
    }
  }

  return !errors.title && !errors.rating && !errors.releaseYear
}

async function submit() {
  if (!validate()) return

  saving.value = true
  try {
    const saved = await saveGame({
      ...form,
      completedAt: toIsoDate(form.completedAt)
    })
    emit('saved', saved, isEdit.value)
    visible.value = false
  } catch (err) {
    errors.general = err?.message ?? 'Не удалось сохранить игру'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="dialogHeader"
    modal
    :draggable="false"
    :dismissable-mask="!saving"
    :style="{ width: 'min(720px, 94vw)' }"
    @show="startTitleWidthTracking"
    @hide="stopTitleWidthTracking"
  >
    <form class="game-form" @submit.prevent="submit">
      <div ref="titleField" class="field field--full">
        <label for="game-title">Название игры *</label>
        <AutoComplete
          v-model="titleModel"
          input-id="game-title"
          :suggestions="suggestions"
          :delay="350"
          :min-length="2"
          :loading="steamBusy"
          :overlay-style="titleOverlayStyle"
          :invalid="Boolean(errors.title)"
          option-label="name"
          placeholder="Начните вводить название — например, Elden Ring"
          fluid
          @complete="onSearchSteam"
          @item-select="onPickSteamGame"
        >
          <template #option="{ option }">
            <div class="steam-option">
              <img
                v-if="option.image"
                :src="option.image"
                alt=""
                class="steam-option__image"
                loading="lazy"
              />
              <span class="steam-option__name">{{ option.name }}</span>
              <span v-if="option.metacritic" class="steam-option__score">
                {{ option.metacritic }}
              </span>
            </div>
          </template>
          <template #empty>
            <div class="steam-empty muted">
              В Steam ничего не нашлось — введите название вручную
            </div>
          </template>
        </AutoComplete>
        <small class="field__hint muted">
          Подсказки из Steam подставят обложку, жанр и год. Платформу и текст выбираете сами.
        </small>
        <small v-if="errors.title" class="field__error">{{ errors.title }}</small>
        <small v-if="steamError" class="field__warn">{{ steamError }}</small>
      </div>

      <div class="field field--full">
        <label>Оценка *</label>
        <RatingInput v-model="form.rating" />
        <small v-if="errors.rating" class="field__error">{{ errors.rating }}</small>
      </div>

      <div class="field">
        <label for="game-platform">Платформа</label>
        <Select
          id="game-platform"
          v-model="form.platform"
          :options="PLATFORM_OPTIONS"
          fluid
        />
      </div>

      <div class="field">
        <label for="game-genre">Жанр</label>
        <InputText id="game-genre" v-model="form.genre" placeholder="Action RPG" fluid />
      </div>

      <div class="field">
        <label for="game-year">Год выхода</label>
        <InputNumber
          id="game-year"
          v-model="form.releaseYear"
          :min="1950"
          :max="2100"
          :use-grouping="false"
          placeholder="—"
          fluid
        />
        <small v-if="errors.releaseYear" class="field__error">{{ errors.releaseYear }}</small>
      </div>

      <div class="field">
        <label for="game-hours">Часов в игре</label>
        <InputNumber
          id="game-hours"
          v-model="form.hours"
          :min="0"
          :max="9999"
          :max-fraction-digits="1"
          placeholder="—"
          fluid
        />
      </div>

      <div class="field">
        <label for="game-date">Дата прохождения</label>
        <DatePicker
          id="game-date"
          v-model="form.completedAt"
          date-format="dd.mm.yy"
          show-icon
          :manual-input="false"
          fluid
        />
      </div>
      <div class="field">
        <label for="game-status">Статус</label>
        <Select
          id="game-status"
          v-model="form.status"
          :options="STATUS_OPTIONS"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>

      <div class="field field--full">
        <label for="game-cover">Обложка</label>
        <div class="cover-row">
          <div class="cover-preview" :class="{ 'cover-preview--empty': !form.coverUrl }">
            <img
              v-if="form.coverUrl && !coverFailed"
              :src="form.coverUrl"
              :alt="form.title || 'Обложка игры'"
              class="cover-preview__image"
              @error="coverFailed = true"
            />
            <span v-else class="cover-preview__hint muted">
              {{ coverFailed ? 'не загрузилась' : 'нет обложки' }}
            </span>
          </div>
          <div class="cover-fields">
            <InputText
              id="game-cover"
              v-model="form.coverUrl"
              placeholder="https://… (необязательно)"
              fluid
            />
            <div class="cover-fields__actions">
              <small class="field__hint muted">
                {{ form.steamAppId ? 'Данные из Steam — можно заменить своей ссылкой' : 'Можно вставить ссылку на любую картинку' }}
              </small>
              <Button
                v-if="form.coverUrl"
                type="button"
                label="Убрать"
                icon="pi pi-times"
                size="small"
                text
                severity="secondary"
                @click="clearCover"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="field field--full">
        <label for="game-verdict">Короткий вывод</label>
        <InputText
          id="game-verdict"
          v-model="form.verdict"
          placeholder="Одна фраза, которая попадёт на карточку"
          fluid
        />
      </div>

      <div class="field field--full">
        <div class="review-head">
          <label for="game-review">Как проходил</label>
          <div class="review-head__tools">
            <button
              type="button"
              class="md-help__toggle"
              :aria-expanded="mdHelpOpen"
              aria-controls="md-help"
              aria-label="Как оформить текст"
              v-tooltip.top="'Как оформить текст'"
              @click="mdHelpOpen = !mdHelpOpen"
            >
              ?
            </button>
            <span class="review-tabs">
              <button
                type="button"
                :class="{ 'is-active': mdMode === 'edit' }"
                @click="mdMode = 'edit'"
              >
                Текст
              </button>
              <button
                type="button"
                :class="{ 'is-active': mdMode === 'preview' }"
                @click="mdMode = 'preview'"
              >
                Предпросмотр
              </button>
            </span>
          </div>
        </div>

        <div v-if="mdHelpOpen" id="md-help" class="md-help">
          <p class="md-help__intro muted">
            Markdown — простые символы для оформления. Пустая строка = новый абзац, одиночный
            Enter = перенос строки.
          </p>
          <ul class="md-help__list">
            <li v-for="item in MD_HELP" :key="item.syntax" class="md-help__row">
              <code class="md-help__syntax">{{ item.syntax }}</code>
              <div class="md-help__result">
                <MarkdownText :text="item.example" class="md-help__example" />
                <span class="md-help__note muted">{{ item.note }}</span>
              </div>
            </li>
          </ul>
          <p class="md-help__note muted">
            Не поддерживается: картинки ![](…) и сырой HTML — они вырезаются санитайзером.
          </p>
        </div>

        <Textarea
          v-if="mdMode === 'edit'"
          id="game-review"
          v-model="form.review"
          rows="8"
          auto-resize
          placeholder="**Итог:** коротко о впечатлениях.&#10;&#10;## Что понравилось&#10;- …"
          fluid
        />
        <div v-else class="review-preview">
          <MarkdownText v-if="form.review.trim()" :text="form.review" />
          <p v-else class="muted">Пока пусто — напишите текст во вкладке «Текст».</p>
        </div>

        <small class="field__hint muted">
          Кнопка «?» — полная шпаргалка с примерами, «Предпросмотр» покажет результат.
        </small>
      </div>

      <div class="field field--full switch-row">
        <ToggleSwitch v-model="form.published" input-id="game-published" />
        <label for="game-published">Опубликовано — видно всем посетителям</label>
      </div>

      <Message v-if="errors.general" severity="error" :closable="false" class="field--full">
        {{ errors.general }}
      </Message>

      <div class="form__footer field--full">
        <Button type="button" label="Отмена" text severity="secondary" @click="visible = false" />
        <Button
          type="submit"
          :label="isEdit ? 'Сохранить изменения' : 'Добавить игру'"
          icon="pi pi-check"
          :loading="saving"
        />
      </div>

    </form>
  </Dialog>
</template>

<style scoped>
.game-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 18px;
  padding-top: 4px;
}

/* Ничего внутри модалки не должно вызывать горизонтальный скролл */
:deep(.p-dialog-content) {
  overflow-x: hidden;
}

.game-form :deep(.p-autocomplete),
.game-form :deep(.p-inputnumber),
.game-form :deep(.p-select),
.game-form :deep(.p-datepicker) {
  width: 100%;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field--full {
  grid-column: 1 / -1;
}

.field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--app-text-muted);
}

.field__error {
  color: #ef5b5b;
  font-size: 0.78rem;
}

.field__warn {
  color: #e0a13a;
  font-size: 0.78rem;
}

.field__hint {
  font-size: 0.76rem;
  line-height: 1.35;
}

/* --- Markdown в «Как проходил» -------------------------------------------- */
.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.review-head__tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.md-help__toggle {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.md-help__toggle:hover {
  color: var(--app-accent);
  border-color: var(--app-accent);
}

.review-tabs {
  display: inline-flex;
  padding: 2px;
  border-radius: 10px;
  background: var(--app-surface-2);
}

.review-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 4px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--app-text-muted);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.review-tabs button.is-active {
  background: var(--app-surface);
  color: var(--app-text);
}

.md-help {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-surface-2);
}

.md-help__intro {
  font-size: 0.78rem;
}

.md-help__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.78rem;
}

.md-help__row {
  display: grid;
  grid-template-columns: minmax(0, 190px) minmax(0, 1fr);
  align-items: start;
  gap: 8px 12px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--app-border);
}

.md-help__row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.md-help__syntax {
  justify-self: start;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--app-surface);
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.md-help__result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}

.md-help__note {
  font-size: 0.72rem;
}

/* Примеры рендерит настоящий markdown — уменьшаем масштаб под шпаргалку */
.md-help__example {
  min-width: 0;
  line-height: 1.3;
}

.md-help__example :deep(p),
.md-help__example :deep(ul),
.md-help__example :deep(ol),
.md-help__example :deep(blockquote),
.md-help__example :deep(pre) {
  margin: 0;
}

.md-help__example :deep(h1),
.md-help__example :deep(h2),
.md-help__example :deep(h3),
.md-help__example :deep(h4) {
  margin: 0;
  font-size: 0.82rem;
}

.md-help__example :deep(ul),
.md-help__example :deep(ol) {
  padding-left: 18px;
}

.md-help__example :deep(blockquote) {
  padding: 2px 8px;
}

.md-help__example :deep(hr) {
  margin: 4px 0;
}

@media (max-width: 520px) {
  .md-help__row {
    grid-template-columns: minmax(0, 1fr);
  }
}

.review-preview {
  min-height: 120px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed var(--app-border);
  background: var(--app-surface-2);
}

/* --- Подсказки Steam ------------------------------------------------------ */
.steam-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.steam-option__image {
  flex: 0 0 auto;
  width: 64px;
  aspect-ratio: 231 / 87;
  object-fit: cover;
  border-radius: 4px;
  background: var(--app-surface-2);
}

.steam-option__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.steam-option__score {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  font-size: 0.72rem;
  font-weight: 700;
}

.steam-empty {
  padding: 10px 12px;
  font-size: 0.82rem;
}

/* --- Обложка -------------------------------------------------------------- */
.cover-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.cover-preview {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 92px;
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-surface-2);
}

.cover-preview__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-preview--empty {
  border-style: dashed;
}

.cover-preview__hint {
  padding: 6px;
  font-size: 0.7rem;
  text-align: center;
}

.cover-fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.cover-fields__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cover-fields__actions .field__hint {
  flex: 1;
  min-width: 0;
}

.switch-row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.switch-row label {
  color: var(--app-text);
  font-size: 0.88rem;
  cursor: pointer;
}

.form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

@media (max-width: 620px) {
  .game-form {
    grid-template-columns: 1fr;
  }
}
</style>

