<script setup>
defineProps({
  icon: { type: String, default: 'pi pi-inbox' },
  title: { type: String, default: 'Пока пусто' },
  text: { type: String, default: '' }
})
</script>

<template>
  <div class="empty surface">
    <i :class="icon" class="empty__icon" />
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="text" class="empty__text muted">{{ text }}</p>
    <div class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 48px 24px;
}

.empty__icon {
  font-size: 2rem;
  color: var(--app-accent);
  opacity: 0.85;
}

.empty__title {
  font-size: 1.1rem;
}

.empty__text {
  max-width: 460px;
  font-size: 0.9rem;
}

.empty__actions:not(:empty) {
  margin-top: 8px;
}
</style>
