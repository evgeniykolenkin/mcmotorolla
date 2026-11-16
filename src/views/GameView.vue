<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import GameDetail from '../components/GameDetail.vue'
import GameFormDialog from '../components/GameFormDialog.vue'
import EmptyState from '../components/EmptyState.vue'
import { useGames } from '../composables/useGames'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const { findGameBySlug, loading, loaded, ensureLoaded, deleteGame } = useGames()
const { isOwner } = useAuth()

const slug = computed(() => String(route.params.slug ?? ''))
const game = computed(() => findGameBySlug(slug.value))
const formVisible = ref(false)
const editing = ref(null)

onMounted(ensureLoaded)

watch(
  game,
  (value) => {
    document.title = value ? `${value.title} · mcmotorolla` : 'Игра не найдена · mcmotorolla'
  },
  { immediate: true }
)

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
      router.push({ name: 'home' })
    }
  })
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <Button
        label="Все игры"
        icon="pi pi-arrow-left"
        text
        size="small"
        severity="secondary"
        class="back"
        @click="router.push({ name: 'home' })"
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

      <GameDetail
        v-else-if="game"
        :game="game"
        @edit="openEdit"
        @delete="askDelete"
      />

      <EmptyState
        v-else
        icon="pi pi-question-circle"
        title="Игра не найдена"
        text="Возможно, запись удалили или ссылка устарела."
      >
        <Button label="На главную" icon="pi pi-arrow-left" outlined @click="router.push({ name: 'home' })" />
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
