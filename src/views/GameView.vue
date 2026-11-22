<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import GameDetail from '../components/GameDetail.vue'
import GameFormDialog from '../components/GameFormDialog.vue'
import CommentsSection from '../components/CommentsSection.vue'
import EmptyState from '../components/EmptyState.vue'
import { useGames } from '../composables/useGames'
import { useAuth } from '../composables/useAuth'
import { commentsAvailable } from '../services/commentsRepository'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const { findGameBySlug, loading, loaded, error, ensureLoaded, refresh, deleteGame } = useGames()
const { isOwner } = useAuth()

const slug = computed(() => String(route.params.slug ?? ''))
const game = computed(() => findGameBySlug(slug.value))
const formVisible = ref(false)
const editing = ref(null)

onMounted(ensureLoaded)

watch(
  [game, error, loading, loaded],
  ([value, loadError, isLoading, isLoaded]) => {
    if (value) document.title = `${value.title} · mcmotorolla`
    else if (isLoading && !isLoaded) document.title = 'Загрузка игры · mcmotorolla'
    else if (loadError) document.title = 'Игры не загрузились · mcmotorolla'
    else document.title = 'Игра недоступна · mcmotorolla'
  },
  { immediate: true }
)

// Vue Router хранит предыдущий адрес в history.state.back, поэтому страница игры
// помнит, откуда пришли: из панели админа вернёмся в панель, с главной — к списку.
function previousPath() {
  return String(router.options.history.state.back ?? '')
}

function backRoute() {
  return previousPath().startsWith('/admin') ? { name: 'admin' } : { name: 'home' }
}

function goBack() {
  // Если история внутри сайта есть, это обычный шаг назад: не плодим записи
  // и сохраняем позицию скролла. Прямой заход по ссылке ведёт на главную.
  if (previousPath().startsWith('/')) {
    router.back()
    return
  }
  router.push({ name: 'home' })
}

function openEdit() {
  editing.value = game.value
  formVisible.value = true
}

function onSaved(saved) {
  toast.add({
    severity: 'success',
    summary: 'Сохранено',
    detail: saved.title,
    life: 2600
  })
}

function askDelete() {
  if (!game.value) return
  const target = game.value

  confirm.require({
    header: 'Удалить игру?',
    message: `«${target.title}» исчезнет из дневника. Действие необратимо.`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Отмена', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Удалить', severity: 'danger' },
    accept: async () => {
      await deleteGame(target.id)
      toast.add({ severity: 'success', summary: 'Игра удалена', detail: target.title, life: 2600 })
      // Заменяем удалённую страницу, чтобы «Назад» не возвращал на неё.
      router.replace(backRoute())
    }
  })
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <Button
        label="Назад"
        icon="pi pi-arrow-left"
        text
        size="small"
        severity="secondary"
        class="back"
        @click="goBack"
      />

      <div v-if="loading && !loaded" class="detail-skeleton">
        <Skeleton height="420px" border-radius="18px" />
        <div class="detail-skeleton__content">
          <Skeleton height="34px" width="60%" />
          <Skeleton height="18px" width="40%" />
          <Skeleton height="120px" />
          <Skeleton height="160px" />
        </div>
      </div>

      <template v-else-if="game">
        <GameDetail
          :game="game"
          @edit="openEdit"
          @delete="askDelete"
        >
          <template #after-content>
            <CommentsSection
              v-if="game.published && commentsAvailable"
              :game-id="game.id"
              :game-title="game.title"
            />

            <Message
              v-if="game.published && !commentsAvailable && isOwner"
              severity="secondary"
              :closable="false"
            >
              Комментарии включатся, когда в окружении заданы VITE_SUPABASE_URL и
              VITE_SUPABASE_ANON_KEY. В локальном режиме их нет.
            </Message>
          </template>
        </GameDetail>
      </template>

      <EmptyState
        v-else-if="error"
        icon="pi pi-exclamation-triangle"
        title="Не удалось загрузить игры"
        :text="error"
      >
        <Button label="Повторить" icon="pi pi-refresh" outlined @click="refresh" />
      </EmptyState>

      <EmptyState
        v-else
        icon="pi pi-question-circle"
        title="Игра недоступна"
        text="Возможно, запись удалили, ссылка устарела или игру сняли с публикации."
      >
        <Button label="Ко всем играм" icon="pi pi-arrow-left" outlined @click="router.push({ name: 'home' })" />
      </EmptyState>
    </div>

    <GameFormDialog v-if="isOwner" v-model="formVisible" :game="editing" @saved="onSaved" />
  </div>
</template>

<style scoped>
.back {
  align-self: flex-start;
}

.detail-skeleton {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 28px;
}

.detail-skeleton__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 820px) {
  .detail-skeleton {
    grid-template-columns: 1fr;
  }
}
</style>
