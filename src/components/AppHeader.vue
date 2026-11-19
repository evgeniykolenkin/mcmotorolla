<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import BrandAvatar from './BrandAvatar.vue'
import ImageEditDialog from './ImageEditDialog.vue'
import { site } from '../config/site'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import { useSiteContent } from '../composables/useSiteContent'

const router = useRouter()
const { isOwner } = useAuth()
const { isDark, toggleTheme } = useTheme()
const { content, ensureLoaded, pending } = useSiteContent()

// Дефолты видны сразу, сохранённые тексты подставятся после ответа базы
ensureLoaded()

const avatarVisible = ref(false)
const themeIcon = computed(() => (isDark.value ? 'pi pi-sun' : 'pi pi-moon'))
const themeLabel = computed(() => (isDark.value ? 'Светлая тема' : 'Тёмная тема'))
</script>

<template>
  <header class="app-header">
    <div class="container header-inner">
      <div class="brand-wrap">
        <RouterLink :to="{ name: 'home' }" class="brand" aria-label="На главную">
          <BrandAvatar :src="content.brand.avatarUrl" :alt="site.nickname" :loading="pending" />
          <span class="brand__name">{{ site.nickname }}</span>
        </RouterLink>

        <button
          v-if="isOwner"
          type="button"
          class="brand-wrap__edit"
          aria-label="Изменить аватарку"
          v-tooltip.bottom="'Изменить аватарку'"
          @click="avatarVisible = true"
        >
          <i class="pi pi-camera" />
        </button>
      </div>

      <ImageEditDialog
        v-if="isOwner"
        v-model="avatarVisible"
        model-key="brand.avatarUrl"
        title="Аватарка в шапке"
        hint="Квадратная картинка, лучше от 512×512. Файл сжимается в браузере до 512 px (WebP)."
        folder="avatar"
        :max-width="512"
        :max-height="512"
        shape="circle"
      />

      <nav class="nav">
        <RouterLink :to="{ name: 'home' }" class="nav__link">
          <i class="pi pi-star-fill" /> <span class="nav__link-text">Игры</span>
        </RouterLink>

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
  min-height: 76px;
}

.brand-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  --avatar-size: 60px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  min-width: 0;
  color: inherit;
}

.brand:hover .brand__name {
  color: var(--app-accent);
}

.brand-wrap__edit {
  position: absolute;
  left: calc(var(--avatar-size, 60px) - 20px);
  bottom: -2px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text-muted);
  font-size: 0.6rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.brand-wrap__edit:hover {
  color: var(--app-accent);
  border-color: var(--app-accent);
}

.brand__name {
  min-width: 0;
  overflow: hidden;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
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

@media (max-width: 720px) {
  .nav__link {
    padding: 8px 9px;
  }
}

@media (max-width: 560px) {
  .header-inner {
    gap: 8px;
    min-height: 64px;
  }

  .brand-wrap {
    --avatar-size: 48px;
  }

  .brand-wrap__edit {
    width: 18px;
    height: 18px;
    font-size: 0.55rem;
  }

  .brand__name {
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
