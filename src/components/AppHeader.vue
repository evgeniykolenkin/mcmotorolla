<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { site } from '../config/site'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'

const route = useRoute()
const router = useRouter()
const { isOwner } = useAuth()
const { isDark, toggleTheme } = useTheme()

const themeIcon = computed(() => (isDark.value ? 'pi pi-sun' : 'pi pi-moon'))
const themeLabel = computed(() => (isDark.value ? 'Светлая тема' : 'Тёмная тема'))
const isAdminPage = computed(() => route.name === 'admin')

function openCreate() {
  router.push({ name: 'admin', query: { create: '1' } })
}
</script>

<template>
  <header class="app-header">
    <div class="container header-inner">
      <RouterLink :to="{ name: 'home' }" class="brand">
        <span class="brand__logo">MC</span>
        <span class="brand__text">
          <strong>{{ site.nickname }}</strong>
          <small class="muted">{{ site.tagline }}</small>
        </span>
      </RouterLink>

      <nav class="nav">
        <RouterLink :to="{ name: 'home' }" class="nav__link">
          <i class="pi pi-star-fill" /> <span class="nav__link-text">Игры</span>
        </RouterLink>

        <Button
          v-if="isOwner && !isAdminPage"
          label="Добавить"
          icon="pi pi-plus"
          size="small"
          @click="openCreate"
        />

        <a
          v-if="site.twitchUrl"
          :href="site.twitchUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="nav__link nav__link--twitch"
          v-tooltip.bottom="'Канал на Twitch'"
        >
          <i class="pi pi-twitch" />
          <span class="nav__twitch-text">Twitch</span>
        </a>

        <Button
          v-tooltip.bottom="themeLabel"
          :icon="themeIcon"
          text
          rounded
          severity="secondary"
          aria-label="Переключить тему"
          @click="toggleTheme"
        />

        <Button
          v-if="isOwner"
          icon="pi pi-cog"
          label="Панель"
          text
          size="small"
          severity="secondary"
          @click="router.push({ name: 'admin' })"
        />
        <Button
          v-else
          icon="pi pi-sign-in"
          label="Войти"
          text
          size="small"
          severity="secondary"
          @click="router.push({ name: 'admin' })"
        />
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(14px);
  background: color-mix(in srgb, var(--app-bg) 82%, transparent);
  border-bottom: 1px solid var(--app-border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 68px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand__logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: linear-gradient(135deg, #9146ff, #25c8ff);
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  box-shadow: 0 8px 20px -12px rgba(145, 70, 255, 0.9);
  flex: 0 0 auto;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.brand__text strong {
  font-size: 1rem;
}

.brand__text small {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.nav__link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--app-text-muted);
  transition: background 0.15s ease, color 0.15s ease;
}

.nav__link:hover {
  background: var(--app-accent-soft);
  color: var(--app-text);
}

.nav__link i {
  font-size: 0.85rem;
  color: var(--app-accent);
}

.nav__link--twitch i {
  color: #a970ff;
}

@media (max-width: 720px) {
  .brand__text small {
    display: none;
  }

  .nav__twitch-text {
    display: none;
  }

  .nav__link {
    padding: 8px 9px;
  }
}

@media (max-width: 560px) {
  .header-inner {
    gap: 8px;
    min-height: 60px;
  }

  .brand__logo {
    width: 34px;
    height: 34px;
    font-size: 0.8rem;
    border-radius: 11px;
  }

  .brand__text strong {
    font-size: 0.9rem;
  }

  .nav {
    gap: 2px;
  }

  .nav__link-text,
  .nav :deep(.p-button-label) {
    display: none;
  }

  .nav :deep(.p-button) {
    padding: 8px;
  }
}
</style>
