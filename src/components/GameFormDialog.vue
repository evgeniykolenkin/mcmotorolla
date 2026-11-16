<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import RatingInput from './RatingInput.vue'
import { useGames } from '../composables/useGames'
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
  published: true
})

const form = reactive(emptyForm())
const saving = ref(false)
const errors = reactive({ title: '', rating: '', general: '' })

const isEdit = computed(() => Boolean(props.game?.id))
const dialogHeader = computed(() => (isEdit.value ? 'Редактировать игру' : 'Новая игра'))

function resetErrors() {
  Object.assign(errors, { title: '', rating: '', general: '' })
}

function fillForm() {
  resetErrors()

  if (!props.game) {
    Object.assign(form, emptyForm())
    return
  }

  Object.assign(form, {
    ...props.game,
    hours: props.game.hours ?? null,
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

  return !errors.title && !errors.rating
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
        <InputText
          id="game-title"
          v-model="form.title"
          placeholder="Например, Elden Ring"
          :invalid="Boolean(errors.title)"
          fluid
        />
        <small v-if="errors.title" class="field__error">{{ errors.title }}</small>
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

      <div class="field">
        <label for="game-cover">Обложка (URL)</label>
        <InputText
          id="game-cover"
          v-model="form.coverUrl"
          placeholder="https://… (необязательно)"
          fluid
        />
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
  grid-template-columns: 1fr 1fr;
  gap: 16px 18px;
  padding-top: 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

