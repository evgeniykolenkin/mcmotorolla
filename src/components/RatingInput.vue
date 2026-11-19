<script setup>
import { computed } from 'vue'
import Slider from 'primevue/slider'
import { ratingTone } from '../utils/format'

const rating = defineModel({ type: Number, default: 8 })
const tone = computed(() => ratingTone(rating.value))
</script>

<template>
  <div class="rating-input">
    <div class="rating-input__head">
      <span class="rating-input__value" :class="`tone-${tone.tone}`">
        {{ rating }}<small> / 10</small>
      </span>
      <span class="rating-input__label muted">{{ tone.label }}</span>
    </div>

    <!-- 10 позиций — слайдера достаточно, ручной ввод цифры не нужен -->
    <Slider
      v-model="rating"
      :min="1"
      :max="10"
      :step="1"
      class="rating-input__slider"
      aria-label="Оценка от 1 до 10"
    />
  </div>
</template>

<style scoped>
.rating-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rating-input__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.rating-input__value {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
}

.rating-input__value small {
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.65;
}

.rating-input__label {
  font-size: 0.9rem;
}

.rating-input__slider {
  width: 100%;
}
</style>
