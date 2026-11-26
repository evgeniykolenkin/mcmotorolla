<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import BrandAvatar from './BrandAvatar.vue'
import ImageEditDialog from './ImageEditDialog.vue'
import { site } from '../config/site'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import { useSiteContent } from '../composables/useSiteContent'

const router = useRouter()
const route = useRoute()
const { isOwner } = useAuth()
const { isDark, toggleTheme } = useTheme()
const { content, ensureLoaded, pending } = useSiteContent()

// Дефолты видны сразу, сохранённые тексты подставятся после ответа базы
ensureLoaded()

// Когда появится раздел фильмов, достаточно включить флаг и добавить маршруты.
const MOVIES_ENABLED = false

const primaryNav = [
  {
    key: 'games',
    label: 'Игры',
    icon: 'pi pi-desktop',
    to: { name: 'home' },
    activeFor: ['home', 'game']
  },
  {
    key: 'movies',
    label: 'Фильмы',
    icon: 'pi pi-video',
    to: MOVIES_ENABLED ? { name: 'movies' } : null,
    activeFor: ['movies', 'movie'],
    soon: !MOVIES_ENABLED
  }
]

const avatarVisible = ref(false)
const mobileOpen = ref(false)
const burgerRef = ref(null)
const restoreFocus = ref(true)

let desktopMedia = null

const themeIcon = computed(() => (isDark.value ? 'pi pi-sun' : 'pi pi-moon'))
const themeLabel = computed(() => (isDark.value ? 'Светлая тема' : 'Тёмная тема'))
const accountLabel = computed(() => (isOwner.value ? 'Панель админа' : 'Войти'))
const accountIcon = computed(() => (isOwner.value ? 'pi pi-cog' : 'pi pi-sign-in'))

function isActive(item) {
  return Boolean(item.to) && item.activeFor.includes(route.name)
}

function toggleMenu() {
  if (!mobileOpen.value) {
    restoreFocus.value = true
  }

  mobileOpen.value = !mobileOpen.value
}

function onNavClick(item) {
  // На тот же маршрут фокус возвращаем на бургер, при переходе — не мешаем странице.
  restoreFocus.value = route.name === item.to?.name
  mobileOpen.value = false
}

function goToAdmin() {
  restoreFocus.value = route.name !== 'admin'
  mobileOpen.value = false

  if (route.name !== 'admin') {
    router.push({ name: 'admin' })
  }
}

function onDrawerAfterHide() {
  if (!restoreFocus.value) {
    restoreFocus.value = true
    return
  }

  if (window.matchMedia('(max-width: 820px)').matches) {
    burgerRef.value?.$el?.focus()
  }
}

function onDesktopBreakpoint(event) {
  if (event.matches && mobileOpen.value) {
    restoreFocus.value = false
    mobileOpen.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    if (!mobileOpen.value) return

    restoreFocus.value = false
    mobileOpen.value = false
  }
)

onMounted(() => {
  desktopMedia = window.matchMedia('(min-width: 821px)')
  desktopMedia.addEventListener('change', onDesktopBreakpoint)
})

onBeforeUnmount(() => {
  desktopMedia?.removeEventListener('change', onDesktopBreakpoint)
})
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

      <div class="header-end">
        <nav class="nav nav--desktop" aria-label="Основная навигация">
          <template v-for="item in primaryNav" :key="item.key">
            <RouterLink
              v-if="item.to"
              :to="item.to"
              class="nav__link"
              :class="{ 'nav__link--active': isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <i :class="item.icon" aria-hidden="true" />
              <span class="nav__link-text">{{ item.label }}</span>
            </RouterLink>
            <span
              v-else
              class="nav__link nav__link--disabled"
              aria-disabled="true"
            >
              <i :class="item.icon" aria-hidden="true" />
              <span class="nav__link-text">{{ item.label }}</span>
              <span v-if="item.soon" class="nav__soon">скоро</span>
            </span>
          </template>
        </nav>

        <div class="header-controls">
          <Button
            v-tooltip.bottom="themeLabel"
            :icon="themeIcon"
            :aria-label="themeLabel"
            text
            rounded
            severity="secondary"
            @click="toggleTheme"
          />
          <Button
            v-if="isOwner"
            icon="pi pi-cog"
            label="Панель админа"
            text
            size="small"
            severity="secondary"
            class="nav__account header-account"
            :class="{ 'nav__account--active': route.name === 'admin' }"
            @click="goToAdmin"
          />
          <Button
            v-else
            icon="pi pi-sign-in"
            label="Войти"
            text
            size="small"
            severity="secondary"
            class="nav__account header-account"
            :class="{ 'nav__account--active': route.name === 'admin' }"
            @click="goToAdmin"
          />
          <Button
            ref="burgerRef"
            class="nav__burger"
            :icon="mobileOpen ? 'pi pi-times' : 'pi pi-bars'"
            :aria-label="mobileOpen ? 'Закрыть меню' : 'Открыть меню'"
            :aria-expanded="mobileOpen"
            aria-controls="mobile-navigation"
            aria-haspopup="dialog"
            text
            rounded
            severity="secondary"
            @click="toggleMenu"
          />
        </div>
      </div>
    </div>

    <Drawer
      v-model:visible="mobileOpen"
      header="Меню"
      position="right"
      :style="{ width: 'min(320px, 86vw)' }"
      block-scroll
      @after-hide="onDrawerAfterHide"
    >
      <nav
        id="mobile-navigation"
        class="mobile-nav"
        aria-label="Мобильная навигация"
      >
        <p class="mobile-nav__eyebrow">Разделы</p>

        <template v-for="item in primaryNav" :key="item.key">
          <RouterLink
            v-if="item.to"
            :to="item.to"
            class="mobile-nav__link"
            :class="{ 'mobile-nav__link--active': isActive(item) }"
            :aria-current="isActive(item) ? 'page' : undefined"
            @click="onNavClick(item)"
          >
            <i :class="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
          <span
            v-else
            class="mobile-nav__link mobile-nav__link--disabled"
            aria-disabled="true"
          >
            <i :class="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <span v-if="item.soon" class="mobile-nav__soon">скоро</span>
          </span>
        </template>

        <div class="mobile-nav__divider" />
        <p class="mobile-nav__eyebrow">Аккаунт</p>

        <button
          type="button"
          class="mobile-nav__link mobile-nav__account"
          :class="{ 'mobile-nav__link--active': route.name === 'admin' }"
          :aria-current="route.name === 'admin' ? 'page' : undefined"
          @click="goToAdmin"
        >
          <i :class="accountIcon" aria-hidden="true" />
          <span>{{ accountLabel }}</span>
        </button>
      </nav>
    </Drawer>
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
  min-height: var(--app-header-height);
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

.header-end {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.nav__link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 12px;
  color: var(--app-text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav__link:hover {
  background: var(--app-accent-soft);
  color: var(--app-text);
}

.nav__link--active {
  background: var(--app-accent-soft);
  color: var(--app-text);
}

.nav__link i {
  color: var(--app-accent);
  font-size: 0.85rem;
}

.nav__link--disabled {
  opacity: 0.6;
  cursor: default;
}

.nav__link--disabled:hover {
  background: transparent;
  color: var(--app-text-muted);
}

.nav__soon,
.mobile-nav__soon {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
  text-transform: uppercase;
}

.nav__account--active.p-button {
  background: var(--app-accent-soft);
  color: var(--app-text);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav__burger {
  display: none;
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
}

.mobile-nav__eyebrow {
  margin: 10px 6px 4px;
  color: var(--app-text-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mobile-nav__eyebrow:first-child {
  margin-top: 0;
}

.mobile-nav__link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border-radius: 14px;
  color: var(--app-text-muted);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  transition: background 0.15s ease, color 0.15s ease;
}

.mobile-nav__link:hover {
  background: var(--app-accent-soft);
  color: var(--app-text);
}

.mobile-nav__link--active {
  background: var(--app-accent-soft);
  color: var(--app-text);
}

.mobile-nav__link i {
  width: 20px;
  color: var(--app-accent);
  font-size: 0.95rem;
  text-align: center;
}

.mobile-nav__link--disabled {
  opacity: 0.6;
  cursor: default;
}

.mobile-nav__link--disabled:hover {
  background: transparent;
  color: var(--app-text-muted);
}

.mobile-nav__soon {
  margin-left: auto;
}

.mobile-nav__divider {
  height: 1px;
  margin: 8px 6px;
  background: var(--app-border);
}

.mobile-nav__account {
  border: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

@media (max-width: 820px) {
  .nav--desktop {
    display: none;
  }

  .nav__burger {
    display: inline-flex;
  }

  .header-account {
    display: none;
  }
}

@media (max-width: 560px) {
  .header-inner {
    gap: 8px;
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

  .header-end {
    gap: 2px;
  }

  .header-controls {
    gap: 0;
  }
}
</style>
