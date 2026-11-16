<script setup>
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import EmptyState from '../components/EmptyState.vue'

const router = useRouter()
</script>

<template>
  <div class="page">
    <div class="container">
      <EmptyState
        icon="pi pi-compass"
        title="Страница не найдена"
        text="Такой адрес не существует. Возможно, ссылка устарела."
      >
        <Button label="На главную" icon="pi pi-home" @click="router.push({ name: 'home' })" />
      </EmptyState>
    </div>
  </div>
</template>
