<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import StatsBar from '../components/StatsBar.vue'
import GamesToolbar from '../components/GamesToolbar.vue'
import GameCard from '../components/GameCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { useGames } from '../composables/useGames'
import { useAuth } from '../composables/useAuth'
import { site } from '../config/site'

const router = useRouter()
const { games, filteredGames, loading, loaded, error, ensureLoaded, refresh, resetFilters } =
  useGames()
const { isOwner } = useAuth()

onMounted(ensureLoaded)

function openTwitch() {
  window.open(site.twitchUrl, '_blank', 'noopener')
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <section class="hero">
        <p class="hero__eyebrow"><i class="pi pi-star-fill" /> дневник пройденных игр</p>
        <h1 class="hero__title">{{ site.tagline }}</h1>
        <p class="hero__subtitle">{{ site.subtitle }}</p>
        <div class="hero__actions">
          <Button
            v-if="site.twitchUrl"
            label="Смотреть на Twitch"
            icon="pi pi-twitch"
            @click="openTwitch"
          />
          <Button
            v-if="isOwner"
            label="Панель владельца"
            icon="pi pi-cog"
            outlined
            severity="secondary"
            @click="router.push({ name: 'admin' })"
          />
        </div>
      </section>

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
}
</style>
