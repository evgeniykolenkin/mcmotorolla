<script setup>
import { computed } from 'vue'
import { useGames } from '../composables/useGames'

const { stats } = useGames()

const items = computed(() => [
  { icon: 'pi pi-check-circle', label: 'Пройдено игр', value: stats.value.count },
  { icon: 'pi pi-star-fill', label: 'Средняя оценка', value: stats.value.average, suffix: ' / 10' },
  { icon: 'pi pi-clock', label: 'Часов в играх', value: stats.value.hours }
])
</script>

<template>
  <div class="stats">
    <div v-for="item in items" :key="item.label" class="stat surface">
      <i :class="item.icon" class="stat__icon" />
      <div class="stat__body">
        <div class="stat__value">
          {{ item.value }}<small v-if="item.suffix">{{ item.suffix }}</small>
        </div>
        <div class="stat__label muted">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}

.stat__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  font-size: 1.05rem;
  line-height: 1;
  flex: 0 0 auto;
}

.stat__value {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat__value small {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.6;
}

.stat__label {
  font-size: 0.82rem;
}

@media (max-width: 640px) {
  .stats {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stat {
    padding: 12px 14px;
  }

  .stat__icon {
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }

  .stat__value {
    font-size: 1.25rem;
  }
}
</style>
