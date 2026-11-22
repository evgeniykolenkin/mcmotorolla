<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Tag from 'primevue/tag'
import RatingBadge from './RatingBadge.vue'
import StatusBadge from './StatusBadge.vue'
import { formatDate, formatHours } from '../utils/format'

const props = defineProps({
  game: { type: Object, required: true },
  // grid — обложка сверху, list — горизонтальная строка на главной
  layout: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value)
  }
})

const initials = computed(() =>
  props.game.title
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
)
</script>

<template>
  <RouterLink
    :to="{ name: 'game', params: { slug: game.slug } }"
    class="game-card surface"
    :class="`game-card--${layout}`"
  >
    <template v-if="layout === 'grid'">
      <div class="game-card__cover">
        <img
          v-if="game.coverUrl"
          :src="game.coverUrl"
          :alt="game.title"
          loading="lazy"
          class="game-card__image"
        />
        <div v-else class="cover-fallback game-card__fallback">
          <span>{{ initials }}</span>
        </div>

        <div class="game-card__badges">
          <Tag v-if="!game.published" value="Черновик" severity="warn" />
          <StatusBadge :status="game.status" />
        </div>
        <RatingBadge :rating="game.rating" class="game-card__rating" />
      </div>

      <div class="game-card__body">
        <h3 class="game-card__title">{{ game.title }}</h3>
        <p class="game-card__verdict muted">{{ game.verdict || game.genre }}</p>
        <div class="game-card__meta muted">
          <span>{{ game.platform }}</span>
          <span v-if="game.releaseYear">· {{ game.releaseYear }}</span>
          <span v-if="game.hours">· {{ formatHours(game.hours) }}</span>
          <span>· {{ formatDate(game.completedAt) }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="game-row__cover">
        <img
          v-if="game.coverUrl"
          :src="game.coverUrl"
          :alt="game.title"
          loading="lazy"
          class="game-row__image"
        />
        <div v-else class="cover-fallback game-row__fallback">
          <span>{{ initials }}</span>
        </div>
      </div>

      <div class="game-row__body">
        <div class="game-row__head">
          <h3 class="game-row__title">{{ game.title }}</h3>
          <RatingBadge :rating="game.rating" class="game-row__rating" />
        </div>

        <p class="game-row__verdict muted">{{ game.verdict || game.genre }}</p>

        <div class="game-row__foot">
          <div class="game-row__badges">
            <Tag v-if="!game.published" value="Черновик" severity="warn" />
            <StatusBadge :status="game.status" variant="inline" />
          </div>
          <div class="game-row__meta muted">
            <span>{{ game.platform }}</span>
            <span v-if="game.releaseYear">· {{ game.releaseYear }}</span>
            <span v-if="game.hours">· {{ formatHours(game.hours) }}</span>
            <span>· {{ formatDate(game.completedAt) }}</span>
          </div>
        </div>
      </div>
    </template>
  </RouterLink>
</template>

<style scoped>
.game-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--app-accent) 45%, transparent);
  box-shadow: 0 22px 44px -30px rgba(145, 70, 255, 0.75);
}

.game-card__cover {
  position: relative;
  aspect-ratio: 3 / 4;
  background: var(--app-surface-2);
}

.game-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.game-card__fallback {
  width: 100%;
  height: 100%;
  font-size: 2rem;
}

.game-card__badges {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
  max-width: calc(100% - 20px);
}

.game-card__rating {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background-color: rgba(10, 8, 20, 0.55);
  backdrop-filter: blur(6px);
}

.game-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 15px 16px;
}

.game-card__title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}

.game-card__verdict {
  font-size: 0.83rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-card__meta {
  font-size: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Список: компактная строка с обложкой слева, без «прыжка» при наведении */
.game-card--list {
  display: grid;
  grid-template-columns: 75px minmax(0, 1fr);
  min-height: 100px;
  transition: box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.game-card--list:hover {
  transform: none;
  border-color: color-mix(in srgb, var(--app-accent) 40%, transparent);
  background: color-mix(in srgb, var(--app-accent) 3%, var(--app-surface));
  box-shadow: 0 18px 36px -30px rgba(145, 70, 255, 0.65);
}

.game-row__cover {
  overflow: hidden;
  min-height: 100px;
  background: var(--app-surface-2);
}

.game-row__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.game-row__fallback {
  width: 100%;
  height: 100%;
  min-height: 100px;
  font-size: 1.1rem;
}

.game-row__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 9px 16px 10px;
}

.game-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.game-row__title {
  min-width: 0;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-row__rating {
  flex: 0 0 auto;
}

.game-row__verdict {
  max-width: 86ch;
  font-size: 0.82rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-row__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: auto;
  padding-top: 2px;
}

.game-row__badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.game-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.72rem;
}

@media (max-width: 640px) {
  .game-card--list {
    grid-template-columns: 72px minmax(0, 1fr);
    min-height: 96px;
  }

  .game-row__cover,
  .game-row__fallback {
    min-height: 96px;
  }

  .game-row__fallback {
    font-size: 1rem;
  }

  .game-row__body {
    gap: 3px;
    padding: 8px 12px 8px 13px;
  }

  .game-row__head {
    gap: 8px;
  }

  .game-row__title {
    font-size: 0.92rem;
  }

  .game-row__verdict {
    font-size: 0.78rem;
  }

  .game-row__foot {
    flex-wrap: nowrap;
    gap: 4px 8px;
    padding-top: 1px;
  }

  .game-row__badges {
    flex: 0 0 auto;
  }

  .game-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: block;
    overflow: hidden;
    font-size: 0.68rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
