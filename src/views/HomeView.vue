<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useToast } from 'primevue/usetoast'
import StatsBar from '../components/StatsBar.vue'
import GamesToolbar from '../components/GamesToolbar.vue'
import GameCard from '../components/GameCard.vue'
import EmptyState from '../components/EmptyState.vue'
import EditableText from '../components/EditableText.vue'
import ImageEditDialog from '../components/ImageEditDialog.vue'
import HeroButtonDialog from '../components/HeroButtonDialog.vue'
import { useGames } from '../composables/useGames'
import { useAuth } from '../composables/useAuth'
import { useSiteContent } from '../composables/useSiteContent'
import { buttonAppearance, normalizeUrl } from '../config/content'

const router = useRouter()
const toast = useToast()
const {
  games,
  filteredGames,
  stats,
  search,
  loading,
  loaded,
  error,
  ensureLoaded,
  refresh,
  resetFilters
} = useGames()
const { isOwner } = useAuth()
const { content, ensureLoaded: ensureContentLoaded, pending: contentPending } = useSiteContent()

const bgVisible = ref(false)
const heroBg = computed(() => content.value.hero.bgUrl)
// Картинка фона проявляется после загрузки: без «прыжка» с пустого фона
const heroBgReady = ref(false)
// Куда кадрировать фон: top | center | bottom
const heroPosition = computed(() => content.value.hero.bgPosition)

/**
 * Кнопки главной: две первые (primary/secondary) и добавленные владельцем.
 * Для владельца все кнопки равны: любую можно изменить или удалить.
 */
const heroButtons = computed(() => {
  const hero = content.value.hero
  const list = [
    {
      kind: 'primary',
      index: -1,
      label: hero.primaryLabel,
      url: normalizeUrl(hero.primaryUrl),
      icon: hero.primaryIcon,
      color: hero.primaryColor
    },
    {
      kind: 'secondary',
      index: -1,
      label: hero.secondaryLabel,
      url: normalizeUrl(hero.secondaryUrl),
      icon: hero.secondaryIcon,
      color: hero.secondaryColor
    }
  ]

  hero.extraButtons.forEach((button, index) => {
    list.push({ kind: 'extra', index, ...button })
  })

  return list
    .filter((button) => Boolean(button.url))
    .map((button) => ({
      ...button,
      icon: button.icon || undefined,
      appearance: buttonAppearance(button.color)
    }))
})

// В шапке списка — общее число игр; при поиске показываем, сколько из них нашлось
const resultsTitle = computed(() => {
  if (loading.value && !loaded.value) return 'Загружаем игры…'

  const total = `Всего игр: ${stats.value.count}`
  return search.value.trim() ? `${total} · найдено: ${filteredGames.value.length}` : total
})

const buttonDialog = ref(false)
const editingKind = ref('extra')
const editingIndex = ref(-1)
const editingButton = ref(null)

watch(heroBg, () => {
  heroBgReady.value = false
})

onMounted(() => {
  ensureLoaded()
  ensureContentLoaded()
})

function openSocial(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener')
}

/** null — добавление новой кнопки, объект — правка существующей. */
function openButtonEditor(button = null) {
  editingKind.value = button?.kind ?? 'extra'
  editingIndex.value = button?.index ?? -1
  editingButton.value = button
    ? { label: button.label, url: button.url, icon: button.icon, color: button.color }
    : null
  buttonDialog.value = true
}

function onButtonSaved(label) {
  toast.add({ severity: 'success', summary: 'Кнопка сохранена', detail: label, life: 2600 })
}

function onButtonRemoved(label) {
  toast.add({ severity: 'info', summary: 'Кнопка удалена', detail: label, life: 2600 })
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <section
        class="hero"
        :class="{ 'hero--media': Boolean(heroBg) }"
        :aria-busy="contentPending"
      >
        <img
          v-if="heroBg"
          class="hero__bg"
          :class="{ 'hero__bg--ready': heroBgReady }"
          :src="heroBg"
          :style="{ objectPosition: heroPosition }"
          alt=""
          decoding="async"
          @load="heroBgReady = true"
        />
        <div v-if="heroBg" class="hero__veil" aria-hidden="true" />

        <div class="hero__content">
          <!-- Пока site_settings грузится, вместо дефолтных текстов — скелетоны -->
          <div v-if="contentPending" class="hero__skeleton" aria-hidden="true">
            <Skeleton width="min(420px, 92%)" height="38px" border-radius="12px" />
            <Skeleton width="min(280px, 62%)" height="38px" border-radius="12px" />
            <Skeleton width="min(520px, 100%)" height="13px" border-radius="6px" />
            <Skeleton width="min(440px, 84%)" height="13px" border-radius="6px" />
            <div class="hero__skeleton-actions">
              <Skeleton width="168px" height="42px" border-radius="10px" />
              <Skeleton width="168px" height="42px" border-radius="10px" />
            </div>
          </div>

          <template v-else>
            <EditableText
              tag="h1"
              class="hero__title"
              model-key="hero.title"
              label="Заголовок главной"
              :maxlength="80"
            />

            <EditableText
              tag="p"
              class="hero__subtitle"
              model-key="hero.subtitle"
              label="Подзаголовок главной"
              multiline
              :maxlength="280"
            />

            <div class="hero__actions">
              <span
                v-for="button in heroButtons"
                :key="`${button.kind}-${button.index}`"
                class="hero__action"
              >
                <Button
                  :label="button.label"
                  :icon="button.icon"
                  :outlined="button.appearance.outlined"
                  :severity="button.appearance.severity"
                  @click="openSocial(button.url)"
                />
                <Button
                  v-if="isOwner"
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  severity="secondary"
                  class="hero__action-edit"
                  :aria-label="`Изменить кнопку «${button.label}»`"
                  v-tooltip.top="'Подпись, ссылка, иконка, цвет'"
                  @click="openButtonEditor(button)"
                />
              </span>

              <Button
                v-if="isOwner"
                label="Кнопка"
                icon="pi pi-plus"
                text
                size="small"
                severity="secondary"
                class="hero__add"
                v-tooltip.top="'Добавить ещё одну кнопку'"
                @click="openButtonEditor()"
              />
            </div>
          </template>
        </div>

        <button
          v-if="isOwner"
          type="button"
          class="hero__bg-edit"
          aria-label="Изменить фон секции"
          v-tooltip.top="'Изменить фон секции'"
          @click="bgVisible = true"
        >
          <i class="pi pi-image" />
          <span>Фон</span>
        </button>
      </section>

      <ImageEditDialog
        v-if="isOwner"
        v-model="bgVisible"
        model-key="hero.bgUrl"
        position-key="hero.bgPosition"
        title="Фон главной секции"
        hint="Одно горизонтальное фото (лучше от 1920×1080). Сжимается в браузере до 1920 px в WebP, сверху фиксированный затемняющий слой — текст остаётся читаемым. Положение меняет, какая часть фото попадёт в кадр."
        folder="hero"
        :max-width="1920"
        :max-height="1920"
        shape="wide"
      />

      <HeroButtonDialog
        v-if="isOwner"
        v-model="buttonDialog"
        :kind="editingKind"
        :index="editingIndex"
        :button="editingButton"
        @saved="onButtonSaved"
        @removed="onButtonRemoved"
      />

      <StatsBar />

      <GamesToolbar />

      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
        <Button label="Повторить" size="small" text @click="refresh" />
      </Message>

      <div class="results-head">
        <h2 class="section-title">
          {{ resultsTitle }}
        </h2>
      </div>

      <div v-if="loading && !loaded" class="card-grid">
        <div v-for="index in 6" :key="index" class="skeleton-card surface">
          <Skeleton height="180px" border-radius="0" />
          <div class="skeleton-card__body">
            <Skeleton height="14px" width="80%" />
            <Skeleton height="12px" width="55%" />
          </div>
        </div>
      </div>

      <div v-else-if="filteredGames.length" class="card-grid">
        <GameCard v-for="game in filteredGames" :key="game.id" :game="game" />
      </div>

      <EmptyState
        v-else-if="games.length"
        icon="pi pi-search"
        title="Ничего не нашлось"
        text="Попробуй изменить запрос или сбросить поиск."
      >
        <Button label="Сбросить" icon="pi pi-filter-slash" outlined @click="resetFilters" />
      </EmptyState>

      <EmptyState
        v-else
        icon="pi pi-inbox"
        title="Игр пока нет"
        :text="
          isOwner
            ? 'Добавь первую игру через панель владельца.'
            : 'Как только стример пройдёт первую игру, она появится здесь.'
        "
      >
        <Button
          v-if="isOwner"
          label="Добавить игру"
          icon="pi pi-plus"
          @click="router.push({ name: 'admin', query: { create: '1' } })"
        />
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 42px 36px;
  border-radius: calc(var(--app-radius) + 6px);
  border: 1px solid var(--app-border);
  background:
    radial-gradient(circle at 88% 12%, rgba(145, 70, 255, 0.38), transparent 55%),
    radial-gradient(circle at 8% 92%, rgba(37, 200, 255, 0.2), transparent 52%),
    var(--app-surface);
  box-shadow: var(--app-shadow);
}

.hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 760px;
}

/* С фотографией рамка тише, чтобы не спорить с картинкой */
.hero--media {
  border-color: color-mix(in srgb, var(--app-border) 55%, transparent);
}

.hero__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Появляется только после загрузки файла — фон не «прыгает» с пустого */
.hero__bg--ready {
  opacity: 1;
}

/* Фиксированное затемнение: текст читается и на светлой, и на тёмной теме */
.hero__veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--app-bg) 92%, transparent) 0%,
    color-mix(in srgb, var(--app-bg) 72%, transparent) 55%,
    color-mix(in srgb, var(--app-bg) 44%, transparent) 100%
  );
}

.hero__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  line-height: 1;
}

/* Карандаш у кнопки: виден всегда, но громче — при наведении на пару */
.hero__action-edit {
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.hero__action:hover .hero__action-edit,
.hero__action-edit:focus-visible {
  opacity: 1;
}

/* «+ Кнопка»: заметный пунктирный акцент, чтобы её не теряли среди ссылок */
.hero__add.p-button {
  border: 1px dashed color-mix(in srgb, var(--app-accent) 62%, var(--app-border));
  background: var(--app-accent-soft);
  color: var(--app-text);
  font-weight: 600;
}

.hero__add.p-button :deep(.p-button-icon) {
  color: var(--app-accent);
}

.hero__add.p-button:not(:disabled):hover {
  border-style: solid;
  border-color: var(--app-accent);
  background: color-mix(in srgb, var(--app-accent) 22%, transparent);
  color: var(--app-text);
}

.hero__add.p-button:not(:disabled):active {
  border-color: var(--app-accent);
  background: color-mix(in srgb, var(--app-accent) 30%, transparent);
  color: var(--app-text);
}

.hero__bg-edit {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-surface) 78%, transparent);
  backdrop-filter: blur(10px);
  color: var(--app-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.hero__bg-edit:hover {
  color: var(--app-text);
  border-color: var(--app-accent);
}

/* Иконка в кнопке — по общему размеру кнопочных иконок */
.hero__bg-edit i {
  font-size: var(--app-btn-icon);
  line-height: 1;
}

.hero__title {
  font-size: clamp(1.9rem, 4.4vw, 3rem);
  font-weight: 800;
  /* Крупный заголовок: строки ближе, чем у обычных заголовков */
  line-height: 1.1;
  margin-bottom: 12px;
  max-width: 18ch;
}

.hero__subtitle {
  max-width: 62ch;
  color: var(--app-text-muted);
  font-size: 0.98rem;
}

.hero__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
}

/* Скелетоны на время загрузки site_settings: пропорции как у реальных текстов */
.hero__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: hero-skeleton-in 0.24s ease 0.12s both;
}

.hero__skeleton-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

/* Задержка и плавное появление: на быстром ответе базы скелетон не мигает */
@keyframes hero-skeleton-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__skeleton {
    animation: none;
  }
}

.results-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.skeleton-card {
  overflow: hidden;
}

.skeleton-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}

@media (max-width: 640px) {
  .hero {
    padding: 28px 20px;
  }

  .hero__bg-edit {
    padding: 7px 9px;
  }

  .hero__bg-edit span {
    display: none;
  }
}
</style>
