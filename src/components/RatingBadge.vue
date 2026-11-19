<script setup>
import { computed } from 'vue'
import { ratingTone } from '../utils/format'

const props = defineProps({
  rating: { type: Number, required: true },
  size: { type: String, default: 'md' } // sm | md | lg
})

const tone = computed(() => ratingTone(props.rating))
</script>

<template>
  <span
    class="rating-badge"
    :class="[`tone-${tone.tone}`, `size-${props.size}`]"
    :title="tone.label"
  >
    <strong class="rating-badge__value">{{ props.rating }}</strong>
    <span class="rating-badge__max">/ 10</span>
  </span>
</template>

<style scoped>
.rating-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3em;
  padding: 4px 9px;
  border-radius: 12px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 14%, transparent);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.rating-badge__value {
  font-size: 1.05rem;
}

.rating-badge__max {
  font-size: 0.68rem;
  opacity: 0.75;
}

.size-sm {
  padding: 3px 7px;
  gap: 0.22em;
}
.size-sm .rating-badge__value {
  font-size: 0.9rem;
}

.size-lg {
  padding: 8px 14px;
  border-radius: 16px;
  gap: 0.42em;
}
.size-lg .rating-badge__value {
  font-size: 2rem;
}
.size-lg .rating-badge__max {
  font-size: 0.9rem;
}
</style>
