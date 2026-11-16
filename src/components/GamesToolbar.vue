<script setup>
import { computed } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { useGames } from '../composables/useGames'

const { search, sortBy, platform, platforms, ALL_PLATFORMS, resetFilters } = useGames()

const sortOptions = [
  { label: 'Сначала новые', value: 'recent' },
  { label: 'По оценке', value: 'rating' },
  { label: 'По названию', value: 'title' }
]

const platformOptions = computed(() => [
  { label: 'Все платформы', value: ALL_PLATFORMS },
  ...platforms.value.map((item) => ({ label: item, value: item }))
])

const isFiltered = computed(
  () => Boolean(search.value) || platform.value !== ALL_PLATFORMS || sortBy.value !== 'recent'
)
</script>

<template>
  <div class="toolbar surface">
    <span class="toolbar__search">
      <i class="pi pi-search" />
      <InputText
        v-model="search"
        placeholder="Поиск по названию, жанру, тексту…"
        class="toolbar__input"
        aria-label="Поиск по играм"
      />
      <i v-if="search" class="pi pi-times toolbar__clear" @click="search = ''" />
    </span>

    <div class="toolbar__selects">
      <Select
        v-model="platform"
        :options="platformOptions"
        option-label="label"
        option-value="value"
        aria-label="Платформа"
        class="toolbar__select"
      />
      <Select
        v-model="sortBy"
        :options="sortOptions"
        option-label="label"
        option-value="value"
        aria-label="Сортировка"
        class="toolbar__select"
      />
      <Button
        v-if="isFiltered"
        label="Сбросить"
        icon="pi pi-filter-slash"
        text
        size="small"
        severity="secondary"
        @click="resetFilters"
      />
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  flex-wrap: wrap;
}

.toolbar__search {
  position: relative;
  flex: 1 1 240px;
  display: flex;
  align-items: center;
}

.toolbar__search > i.pi-search {
  position: absolute;
  left: 12px;
  color: var(--app-text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}

.toolbar__input {
  width: 100%;
  padding-left: 34px;
  padding-right: 32px;
}

.toolbar__clear {
  position: absolute;
  right: 10px;
  cursor: pointer;
  color: var(--app-text-muted);
  font-size: 0.8rem;
}

.toolbar__clear:hover {
  color: var(--app-text);
}

.toolbar__selects {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar__select {
  min-width: 172px;
}

@media (max-width: 640px) {
  .toolbar__selects {
    width: 100%;
  }

  .toolbar__select {
    flex: 1;
    min-width: 0;
  }
}
</style>
