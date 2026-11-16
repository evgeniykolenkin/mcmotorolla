<script setup>
import { computed, reactive, ref, watch } from 'vue'
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
import { useGames } from '../composables/useGames'
import { getSteamGame, searchSteamGames } from '../services/steamClient'
import { fromIsoDate, toIsoDate } from '../utils/format'

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

const STATUS_OPTIONS = [
  { label: 'Пройдена', value: 'completed' },
  { label: 'Брошена', value: 'dropped' },
  { label: 'Прохожу сейчас', value: 'playing' }
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

const steamStoreUrl = computed(() =>
  form.steamAppId ? `https://store.steampowered.com/app/${form.steamAppId}/` : ''
)

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

  if (!props.game) {
    Object.assign(form, emptyForm())
    return
  }

  Object.assign(form, {
    ...props.game,
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
    :style="{ width: 'min(720px, 94vw)' }"
  >
    <form class="game-form" @submit.prevent="submit">
      <div class="field field--full">
        <label for="game-title">Название игры *</label>
        <AutoComplete
          v-model="titleModel"
          input-id="game-title"
          :suggestions="suggestions"
          :delay="350"
          :min-length="2"
          :loading="steamBusy"
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
        <small v-else-if="steamStoreUrl" class="field__hint muted">
          <a :href="steamStoreUrl" target="_blank" rel="noopener">Открыть в Steam</a>
        </small>
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
        <label for="game-review">Как проходил</label>
        <Textarea
          id="game-review"
          v-model="form.review"
          rows="7"
          auto-resize
          placeholder="Свободный текст. Пустая строка между блоками = новый абзац."
          fluid
        />
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

.field__hint a {
  color: var(--app-accent);
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

