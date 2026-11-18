<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps({
  text: { type: String, default: '' },
  tag: { type: String, default: 'div' }
})

// renderMarkdown уже прогоняет результат через DOMPurify
const html = computed(() => renderMarkdown(props.text))
</script>

<template>
  <component :is="tag" v-if="html" class="markdown-body" v-html="html" />
</template>
