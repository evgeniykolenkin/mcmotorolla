<script setup>
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppHeader from './components/AppHeader.vue'
import { site, socials } from './config/site'
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

        <div class="footer-side">
          <a
            v-for="social in socials"
            :key="social.key"
            :href="social.url"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-social"
            :class="`footer-social--${social.key}`"
            v-tooltip.top="social.title"
          >
            <i :class="social.icon" />
            <span>{{ social.label }}</span>
          </a>
          <span class="muted">© {{ site.year }}</span>
        </div>
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

.footer-side {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.footer-social {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-text-muted);
  transition: color 0.15s ease;
}

.footer-social:hover {
  color: var(--app-text);
}

.footer-social i {
  font-size: 0.95rem;
}

.footer-social--twitch i {
  color: #a970ff;
}

.footer-social--telegram i {
  color: #2aabee;
}

@media (max-width: 480px) {
  .footer-social span {
    display: none;
  }
}
</style>
