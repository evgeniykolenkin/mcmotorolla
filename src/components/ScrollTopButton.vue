<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const SHOW_AFTER_PX = 480
const visible = ref(false)

let frame = 0

function updateVisibility() {
  frame = 0
  visible.value = window.scrollY > SHOW_AFTER_PX
}

function onScroll() {
  if (frame) return
  frame = window.requestAnimationFrame(updateVisibility)
}

function scrollToTop() {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (frame) {
    window.cancelAnimationFrame(frame)
    frame = 0
  }
})
</script>

<template>
  <Transition name="scroll-top">
    <button
      v-if="visible"
      type="button"
      class="scroll-top-button"
      aria-label="Наверх"
      @click="scrollToTop"
    >
      <i class="pi pi-arrow-up" aria-hidden="true" />
    </button>
  </Transition>
</template>

<style scoped>
.scroll-top-button {
  position: fixed;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 45;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: color-mix(in srgb, var(--app-surface) 92%, transparent);
  backdrop-filter: blur(10px);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.scroll-top-button:hover {
  color: var(--app-accent);
  border-color: var(--app-accent);
  transform: translateY(-2px);
}

.scroll-top-button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
}

.scroll-top-button i {
  font-size: 1.05rem;
  line-height: 1;
}

.scroll-top-enter-active,
.scroll-top-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.scroll-top-enter-from,
.scroll-top-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.92);
}

@media (max-width: 640px) {
  .scroll-top-button {
    right: max(16px, env(safe-area-inset-right));
    bottom: max(16px, env(safe-area-inset-bottom));
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-top-button,
  .scroll-top-enter-active,
  .scroll-top-leave-active {
    transition: none;
  }
}
</style>