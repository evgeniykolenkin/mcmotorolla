<script setup>
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useGames } from '../composables/useGames'

const { search, sortBy } = useGames()

const sortOptions = [
  { label: 'Сначала новые', value: 'recent' },
  { label: 'По оценке', value: 'rating' },
  { label: 'По названию', value: 'title' },
  // Не фильтр, а порядок: пройденные → прохожу → брошенные
  { label: 'По прохождению', value: 'status' }
]

// Фильтр платформ временно скрыт на главной: пока все игры на ПК, он только
// занимает место. Вернуть — раскомментировать блок в шаблоне и деструктуризацию
// platform/platforms/ALL_PLATFORMS ниже.
// const { platform, platforms, ALL_PLATFORMS } = useGames()
// const platformOptions = computed(() => [
//   { label: 'Все платформы', value: ALL_PLATFORMS },
//   ...platforms.value.map((item) => ({ label: item, value: item }))
// ])
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
      <button
        v-if="search"
        type="button"
        class="toolbar__clear"
        aria-label="Очистить поиск"
        v-tooltip.top="'Очистить поиск'"
        @click="search = ''"
      >
        <i class="pi pi-times" />
      </button>
    </span>

    <!-- Фильтр платформ временно скрыт: вернуть вместе с platformOptions в скрипте
    <Select
      v-model="platform"
      :options="platformOptions"
      option-label="label"
      option-value="value"
      aria-label="Платформа"
      class="toolbar__select"
    />
    -->
    <Select
      v-model="sortBy"
      :options="sortOptions"
      option-label="label"
      option-value="value"
      aria-label="Сортировка"
      class="toolbar__select"
    />
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
  flex: 1 1 260px;
  /* Поиск больше не растягивается на всю панель: контролы остаются компактными */
  max-width: 460px;
  display: flex;
  align-items: center;
  min-width: 0;
}

.toolbar__search > i.pi-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--app-text-muted);
  font-size: 0.85rem;
  line-height: 1;
  pointer-events: none;
}

.toolbar__input {
  width: 100%;
  height: var(--control-h);
  padding-left: 34px;
  padding-right: 34px;
}

/* Крестик — настоящая кнопка: одинаково ровно центрируется в любом браузере */
.toolbar__clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.toolbar__clear:hover {
  color: var(--app-text);
  background: var(--app-accent-soft);
}

/* Крестик — иконка внутри кнопки: тот же размер, что у кнопок PrimeVue */
.toolbar__clear i {
  font-size: var(--app-btn-icon);
  line-height: 1;
}

/* Поиск слева, сортировка — справа: пустое место не копится в конце */
.toolbar__select {
  flex: 0 0 auto;
  min-width: 172px;
  margin-inline-start: auto;
}

/* Селект и инпут в одну линию: одна высота, текст по центру */
.toolbar :deep(.p-select) {
  height: var(--control-h);
  display: inline-flex;
  align-items: center;
}

.toolbar :deep(.p-select-label) {
  display: flex;
  align-items: center;
  line-height: 1;
  padding-block: 0;
}

@media (max-width: 640px) {
  .toolbar__search {
    flex-basis: 100%;
    max-width: none;
  }

  .toolbar__select {
    flex: 1 1 auto;
    min-width: 0;
    margin-inline-start: 0;
  }
}
</style>
