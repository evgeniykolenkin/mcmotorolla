<script setup>
import { watch } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import AppHeader from './components/AppHeader.vue'
import EditableText from './components/EditableText.vue'
import { useSiteContent } from './composables/useSiteContent'
import { useAuth } from './composables/useAuth'
import { useGames } from './composables/useGames'
import { site, socials } from './config/site'

// Текст подвала правится на сайте; ensureLoaded идемпотентен и уже вызывается
// при старте приложения, здесь — страховка для прямых ссылок на другие разделы.
const { ensureLoaded } = useSiteContent()
ensureLoaded()

const { isOwner } = useAuth()
const { refresh: refreshGames } = useGames()
const confirm = useConfirm()

// В PrimeVue 4.5 ConfirmDialog не пробрасывает dismissableMask в Dialog,
// поэтому клик по подложке обрабатываем сами через pt. Закрываем только когда
// и нажатие, и отпускание были на самой маске: иначе выделение текста внутри
// окна с выходом курсора за его пределы ошибочно закрывало бы подтверждение.
let confirmMaskPressed = false
const confirmDialogPt = {
  mask: {
    onMousedown(event) {
      confirmMaskPressed = event.target === event.currentTarget
    },
    onMouseup(event) {
      const shouldClose = confirmMaskPressed && event.target === event.currentTarget
      confirmMaskPressed = false
      if (shouldClose) confirm.close()
    }
  }
}

// RLS отдаёт гостю только опубликованные игры, владельцу — ещё и черновики.
// После входа/выхода список надо перезапросить, иначе в памяти остаётся набор
// от прошлой сессии: черновики появлялись только после перезагрузки страницы.
watch(isOwner, () => refreshGames())
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <div class="container footer-inner">
        <EditableText
          tag="span"
          class="muted footer-text"
          model-key="footer.text"
          label="Текст в подвале"
          :maxlength="120"
        />

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
    <!-- Обычный диалог подтверждения не должен перетаскиваться: иначе
         случайное движение мышью по заголовку сдвигает его с центра.
         pt добавляет закрытие по клику на подложку, как у остальных окон. -->
    <ConfirmDialog :draggable="false" :pt="confirmDialogPt" />
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

.footer-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  line-height: 1;
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
