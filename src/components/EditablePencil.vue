<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import EditTextPopover from './EditTextPopover.vue'
import { useAuth } from '../composables/useAuth'

/**
 * Только карандашик без текста — для подписей кнопок в hero,
 * где сам текст рисует PrimeVue Button.
 */
defineProps({
  modelKey: { type: String, required: true },
  label: { type: String, default: 'Текст' },
  multiline: { type: Boolean, default: false },
  maxlength: { type: Number, default: 60 }
})

const { isOwner } = useAuth()
const editor = ref(null)

function open(event) {
  editor.value?.open(event)
}
</script>

<template>
  <Button
    v-if="isOwner"
    v-tooltip.top="`Изменить: ${label}`"
    icon="pi pi-pencil"
    text
    rounded
    size="small"
    severity="secondary"
    class="editable-pencil"
    :aria-label="`Изменить: ${label}`"
    @click.stop.prevent="open"
  />
  <EditTextPopover
    ref="editor"
    :model-key="modelKey"
    :label="label"
    :multiline="multiline"
    :maxlength="maxlength"
  />
</template>

<style scoped>
.editable-pencil {
  width: 26px;
  height: 26px;
  padding: 0;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.editable-pencil:hover,
.editable-pencil:focus-visible {
  opacity: 1;
}

@media (max-width: 560px) {
  .editable-pencil {
    opacity: 0.8;
  }
}
</style>
