<script setup>
import { computed } from 'vue'
import { statusTone } from '../utils/format'

/**
 * Статус прохождения на обложке: цветная точка + короткая подпись.
 * Полная подпись уходит в title/aria-label — «Прохожу сейчас» в плашку не лезет.
 * variant="inline" — для строки списка: текст читается на светлой поверхности.
 */
const props = defineProps({
  status: { type: String, default: '' },
  variant: {
    type: String,
    default: 'overlay',
    validator: (value) => ['overlay', 'inline'].includes(value)
  }
})

const view = computed(() => statusTone(props.status))
</script>

<template>
  <span
    class="status-badge"
    :class="[`status-badge--${view.tone}`, `status-badge--${props.variant}`]"
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
  background: var(--status-tone, currentColor);
}

.status-badge--completed {
  --status-tone: var(--tone-great);
  color: var(--status-tone);
}

.status-badge--playing {
  --status-tone: #25c8ff;
  color: var(--status-tone);
}

.status-badge--dropped {
  --status-tone: var(--tone-bad);
  color: var(--status-tone);
}

/* В списке бейдж лежит на поверхности карточки, а не на обложке */
.status-badge--inline {
  background: color-mix(in srgb, var(--status-tone) 10%, var(--app-surface-2));
  border-color: color-mix(in srgb, var(--status-tone) 45%, var(--app-border));
  backdrop-filter: none;
  color: var(--app-text);
}
</style>
