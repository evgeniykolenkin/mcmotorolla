<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import EditTextPopover from './EditTextPopover.vue'
import { useAuth } from '../composables/useAuth'
import { useSiteContent } from '../composables/useSiteContent'
import { getByPath } from '../config/content'

/**
 * Текст + карандашик (виден только владельцу).
 * Карандашик открывает попап с полем и кнопкой «Сохранить».
 */
const props = defineProps({
  modelKey: { type: String, required: true },
  label: { type: String, default: 'Текст' },
  tag: { type: String, default: 'span' },
  multiline: { type: Boolean, default: false },
  maxlength: { type: Number, default: 160 },
  placeholder: { type: String, default: '' }
})

const { isOwner } = useAuth()
const { content } = useSiteContent()

const editor = ref(null)
const value = computed(() => getByPath(content.value, props.modelKey) ?? '')

function open(event) {
  editor.value?.open(event)
}
</script>

<template>
  <component :is="tag" class="editable-text">
    <span class="editable-text__value">{{ value }}</span>
    <Button
      v-if="isOwner"
      v-tooltip.top="'Изменить'"
      icon="pi pi-pencil"
      text
      rounded
      size="small"
      severity="secondary"
      class="editable-text__pencil"
      :aria-label="`Изменить: ${label}`"
      @click.stop.prevent="open"
    />
    <EditTextPopover
      ref="editor"
      :model-key="modelKey"
      :label="label"
      :multiline="multiline"
      :maxlength="maxlength"
      :placeholder="placeholder"
    />
  </component>
</template>

<style scoped>
/* Текст и карандаш — одна flex-строка: иконка не «прыгает» по baseline */
.editable-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  line-height: inherit;
}

.editable-text__value {
  min-width: 0;
}

.editable-text__pencil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  padding: 0;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

.editable-text:hover .editable-text__pencil,
.editable-text__pencil:focus-visible {
  opacity: 1;
}

@media (max-width: 560px) {
  .editable-text__pencil {
    opacity: 0.8;
    width: 24px;
    height: 24px;
  }
}
</style>
