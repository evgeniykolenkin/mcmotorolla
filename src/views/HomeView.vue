<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import StatsBar from '../components/StatsBar.vue'
import GamesToolbar from '../components/GamesToolbar.vue'
import GameCard from '../components/GameCard.vue'
import EmptyState from '../components/EmptyState.vue'
import EditableText from '../components/EditableText.vue'
import EditablePencil from '../components/EditablePencil.vue'
import ImageEditDialog from '../components/ImageEditDialog.vue'
import { useGames } from '../composables/useGames'
import { useAuth } from '../composables/useAuth'
import { useSiteContent } from '../composables/useSiteContent'
import { site } from '../config/site'

const router = useRouter()
const { games, filteredGames, loading, loaded, error, ensureLoaded, refresh, resetFilters } =
  useGames()
const { isOwner } = useAuth()
const { content, ensureLoaded: ensureContentLoaded } = useSiteContent()

const bgVisible = ref(false)
const heroBg = computed(() => content.value.hero.bgUrl)

onMounted(() => {
  ensureLoaded()
  ensureContentLoaded()
})

function openSocial(url) {
  window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <section class="hero" :class="{ 'hero--media': Boolean(heroBg) }">
        <img v-if="heroBg" class="hero__bg" :src="heroBg" alt="" decoding="async" />
        <div v-if="heroBg" class="hero__veil" aria-hidden="true" />

        <div class="hero__content">
          <p class="hero__eyebrow">
            <i class="pi pi-star-fill" />
            <EditableText
              model-key="hero.eyebrow"
              label="Надпись над заголовком"
              :maxlength="40"
            />
          </p>

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
            <span v-if="site.twitchUrl" class="hero__action">
              <Button
                :label="content.hero.primaryLabel"
                icon="pi pi-twitch"
                @click="openSocial(site.twitchUrl)"
              />
              <EditablePencil
                v-if="isOwner"
                model-key="hero.primaryLabel"
                label="Подпись кнопки Twitch"
                :maxlength="40"
              />
            </span>

            <span v-if="site.telegramUrl" class="hero__action">
              <Button
                :label="content.hero.secondaryLabel"
                icon="pi pi-telegram"
                outlined
                severity="secondary"
                @click="openSocial(site.telegramUrl)"
              />
              <EditablePencil
                v-if="isOwner"
                model-key="hero.secondaryLabel"
                label="Подпись кнопки Telegram"
                :maxlength="40"
              />
            </span>

            <Button
              v-if="isOwner"
              label="Панель владельца"
              icon="pi pi-cog"
              outlined
              severity="secondary"
              @click="router.push({ name: 'admin' })"
            />
          </div>
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
        title="Фон главной секции"
        hint="Одно горизонтальное фото (лучше от 1920×1080). Сжимается в браузере до 1920 px в WebP, сверху фиксированный затемняющий слой — текст остаётся читаемым."
        folder="hero"
        :max-width="1920"
        :max-height="1920"
        shape="wide"
      />

      <StatsBar />

      <GamesToolbar />

      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
        <Button label="Повторить" size="small" text @click="refresh" />
      </Message>

      <div class="results-head">
        <h2 class="section-title">
          {{ loading && !loaded ? 'Загружаем игры…' : `Записей: ${filteredGames.length}` }}
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
        text="Попробуй изменить запрос или сбросить фильтры."
      >
        <Button label="Сбросить фильтры" icon="pi pi-filter-slash" outlined @click="resetFilters" />
      </EmptyState>

      <EmptyState
        v-else
        icon="pi pi-inbox"
        title="Записей пока нет"
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
  gap: 2px;
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

.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-accent);
}

.hero__title {
  font-size: clamp(1.9rem, 4.4vw, 3rem);
  font-weight: 800;
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
