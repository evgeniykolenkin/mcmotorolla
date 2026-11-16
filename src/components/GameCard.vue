<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Tag from 'primevue/tag'
import RatingBadge from './RatingBadge.vue'
import { formatDate, formatHours } from '../utils/format'

const props = defineProps({
  game: { type: Object, required: true }
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
  <RouterLink :to="{ name: 'game', params: { slug: game.slug } }" class="game-card surface">
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

      <Tag v-if="!game.published" class="game-card__draft" value="Черновик" severity="warn" />
      <RatingBadge :rating="game.rating" class="game-card__rating" />
    </div>

    <div class="game-card__body">
      <h3 class="game-card__title">{{ game.title }}</h3>
      <p class="game-card__verdict muted">{{ game.verdict || game.genre }}</p>
      <div class="game-card__meta muted">
        <span>{{ game.platform }}</span>
        <span v-if="game.hours">· {{ formatHours(game.hours) }}</span>
        <span>· {{ formatDate(game.completedAt) }}</span>
      </div>
    </div>
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

.game-card__draft {
  position: absolute;
  top: 10px;
  right: 10px;
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
</style>
