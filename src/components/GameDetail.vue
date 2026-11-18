<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import RatingBadge from './RatingBadge.vue'
import MarkdownText from './MarkdownText.vue'
import { useAuth } from '../composables/useAuth'
import { formatDate, formatHours, ratingTone } from '../utils/format'

const props = defineProps({
  game: { type: Object, required: true }
})
const emit = defineEmits(['edit', 'delete'])

const { isOwner } = useAuth()

const tone = computed(() => ratingTone(props.game.rating))
const statusLabel = computed(
  () =>
    ({ completed: 'Пройдена', dropped: 'Брошена', playing: 'Прохожу сейчас' })[props.game.status] ??
    'Пройдена'
)
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
// Ссылка на магазин есть только у записей, сохранённых с подсказкой Steam
const steamUrl = computed(() =>
  props.game.steamAppId ? `https://store.steampowered.com/app/${props.game.steamAppId}/` : ''
)
</script>

<template>
  <article class="detail">
    <div class="detail__cover surface">
      <img
        v-if="game.coverUrl"
        :src="game.coverUrl"
        :alt="game.title"
        class="detail__image"
      />
      <div v-else class="cover-fallback detail__fallback">
        <span>{{ initials }}</span>
      </div>
    </div>

    <div class="detail__content">
      <div class="detail__top">
        <div>
          <div class="detail__headline">
            <h1 class="detail__title">{{ game.title }}</h1>
            <a
              v-if="steamUrl"
              class="detail__steam"
              :href="steamUrl"
              target="_blank"
              rel="noopener noreferrer"
              title="Страница игры в Steam"
            >
              <i class="pi pi-external-link" />
              <span>Steam</span>
            </a>
          </div>
          <p v-if="game.genre || game.releaseYear" class="muted">
            <template v-if="game.genre">{{ game.genre }}</template>
            <template v-if="game.genre && game.releaseYear"> · </template>
            <template v-if="game.releaseYear">{{ game.releaseYear }}</template>
          </p>
        </div>

        <div class="detail__actions" v-if="isOwner">
          <Button
            label="Редактировать"
            icon="pi pi-pencil"
            size="small"
            outlined
            @click="emit('edit', game)"
          />
          <Button
            icon="pi pi-trash"
            size="small"
            text
            severity="danger"
            aria-label="Удалить игру"
            v-tooltip.bottom="'Удалить'"
            @click="emit('delete', game)"
          />
        </div>
      </div>

      <div class="detail__rating">
        <RatingBadge :rating="game.rating" size="lg" />
        <span class="detail__tone" :class="`tone-${tone.tone}`">{{ tone.label }}</span>
      </div>

      <div class="detail__meta">
        <Tag :value="game.platform" severity="secondary" />
        <Tag :value="statusLabel" severity="contrast" />
        <span class="detail__meta-item muted" v-if="game.completedAt">
          <i class="pi pi-calendar" /> {{ formatDate(game.completedAt) }}
        </span>
        <span class="detail__meta-item muted" v-if="game.hours">
          <i class="pi pi-clock" /> {{ formatHours(game.hours) }}
        </span>
        <Tag v-if="!game.published" value="Черновик" severity="warn" />
      </div>

      <blockquote v-if="game.verdict" class="detail__verdict">
        {{ game.verdict }}
      </blockquote>

      <MarkdownText v-if="game.review" class="detail__review" :text="game.review || ''" />
      <p v-else class="muted">Описание прохождения пока не заполнено.</p>
    </div>
  </article>
</template>

<style scoped>
.detail {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.detail__cover {
  overflow: hidden;
  aspect-ratio: 3 / 4;
  position: sticky;
  top: 92px;
}

.detail__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail__fallback {
  width: 100%;
  height: 100%;
  font-size: 2.6rem;
}

.detail__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.detail__top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.detail__headline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.detail__title {
  font-size: clamp(1.7rem, 3vw, 2.4rem);
}

/* Ссылка на Steam — рядом с названием, тихая пилюля, чтобы не спорить с заголовком */
.detail__steam {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  color: var(--app-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.detail__steam i {
  font-size: 0.72rem;
}

.detail__steam:hover {
  color: var(--app-accent);
  border-color: var(--app-accent);
}

.detail__actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 0 0 auto;
}

.detail__rating {
  display: flex;
  align-items: center;
  gap: 14px;
}

.detail__tone {
  font-weight: 700;
  font-size: 1rem;
}

.detail__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.detail__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.detail__verdict {
  margin: 0;
  padding: 16px 20px;
  border-left: 3px solid var(--app-accent);
  border-radius: 0 14px 14px 0;
  background: var(--app-accent-soft);
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.5;
}

.detail__review {
  font-size: 1rem;
  max-width: 72ch;
}

@media (max-width: 820px) {
  .detail {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .detail__cover {
    position: static;
    max-width: 240px;
  }
}
</style>
