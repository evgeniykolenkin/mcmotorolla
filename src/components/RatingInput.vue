<script setup>
import { computed } from 'vue'
import Slider from 'primevue/slider'
import InputNumber from 'primevue/inputnumber'
import { ratingTone } from '../utils/format'

const rating = defineModel({ type: Number, default: 8 })
const tone = computed(() => ratingTone(rating.value))
</script>

<template>
  <div class="rating-input">
    <div class="rating-input__head">
      <span class="rating-input__value" :class="`tone-${tone.tone}`">
        {{ rating }}<small>/10</small>
      </span>
      <span class="rating-input__label muted">{{ tone.label }}</span>
    </div>

    <div class="rating-input__controls">
      <Slider v-model="rating" :min="1" :max="10" :step="1" class="rating-input__slider" />
      <InputNumber
        v-model="rating"
        :min="1"
        :max="10"
        :use-grouping="false"
        show-buttons
        button-layout="horizontal"
        size="small"
        class="rating-input__number"
        input-class="rating-input__number-input"
      />
    </div>
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

.rating-input__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
}

.rating-input__slider {
  flex: 1 1 200px;
  min-width: 0;
}

.rating-input__number {
  flex: 0 0 auto;
  width: 108px;
}

@media (max-width: 420px) {
  .rating-input__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .rating-input__number {
    width: 100%;
  }
}
</style>
