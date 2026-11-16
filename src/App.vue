<script setup>
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppHeader from './components/AppHeader.vue'
import { site } from './config/site'
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <div class="container footer-inner">
        <span class="muted">{{ site.nickname }} · дневник пройденных игр</span>
        <span class="muted">© {{ site.year }}</span>
      </div>
    </footer>

    <Toast position="bottom-right" />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
}

.app-footer {
  border-top: 1px solid var(--app-border);
  padding: 18px 0;
  font-size: 0.85rem;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
