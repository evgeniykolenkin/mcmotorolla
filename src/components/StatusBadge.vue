<script setup>
import { computed } from 'vue'
import { statusTone } from '../utils/format'

/**
 * Статус прохождения на обложке: цветная точка + короткая подпись.
 * Полная подпись уходит в title/aria-label — «Прохожу сейчас» в плашку не лезет.
 */
const props = defineProps({
  status: { type: String, default: '' }
})

const view = computed(() => statusTone(props.status))
</script>

<template>
  <span
    class="status-badge"
    :class="`status-badge--${view.tone}`"
    :title="view.label"
    :aria-label="view.label"
  >
    <span class="status-badge__dot" aria-hidden="true" />
    {{ view.short }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid currentColor;
  border-radius: 999px;
  /* Тёмная подложка нужна на светлых обложках, иначе текст теряется */
  background: color-mix(in srgb, currentColor 16%, rgba(10, 8, 20, 0.72));
  backdrop-filter: blur(6px);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge--completed {
  color: var(--tone-great);
}

.status-badge--playing {
  color: #25c8ff;
}

.status-badge--dropped {
  color: var(--tone-bad);
}
</style>
