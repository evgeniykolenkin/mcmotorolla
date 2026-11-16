<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import LoginPanel from '../components/LoginPanel.vue'
import GameFormDialog from '../components/GameFormDialog.vue'
import RatingBadge from '../components/RatingBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import { useAuth } from '../composables/useAuth'
import { useGames } from '../composables/useGames'
import { resetToDemo } from '../services/localGamesRepo'
import { formatDate, formatHours } from '../utils/format'
import { isDemoBackend } from '../config/site'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const { isOwner, signOut } = useAuth()
const { allGames, loading, stats, ensureLoaded, refresh, deleteGame } = useGames()

const formVisible = ref(false)
const editing = ref(null)
const resetting = ref(false)

const draftCount = computed(() => allGames.value.filter((game) => !game.published).length)

const confirmAction = {
  rejectProps: { label: 'Отмена', severity: 'secondary', outlined: true }
}

onMounted(ensureLoaded)

watch(
  () => [isOwner.value, route.query.create],
  ([owner, create]) => {
    if (owner && create === '1') {
      openCreate()
      router.replace({ name: 'admin' })
    }
  },
  { immediate: true }
)

function openCreate() {
  editing.value = null
  formVisible.value = true
}

function openEdit(game) {
  editing.value = game
  formVisible.value = true
}

function onSaved(saved, wasEdit) {
  toast.add({
    severity: 'success',
    summary: wasEdit ? 'Изменения сохранены' : 'Игра добавлена',
    detail: saved.title,
    life: 2600
  })
}

function onLogin() {
  toast.add({
    severity: 'success',
    summary: 'Вход выполнен',
    detail: 'Теперь можно добавлять и редактировать игры',
    life: 2600
  })
}

function doSignOut() {
  signOut()
  toast.add({ severity: 'secondary', summary: 'Вы вышли', life: 2000 })
}

function askDelete(game) {
  confirm.require({
    ...confirmAction,
    header: 'Удалить игру?',
    message: `«${game.title}» исчезнет из дневника. Действие необратимо.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Удалить', severity: 'danger' },
    accept: async () => {
      await deleteGame(game.id)
      toast.add({ severity: 'success', summary: 'Игра удалена', detail: game.title, life: 2600 })
    }
  })
}

function askReset() {
  confirm.require({
    ...confirmAction,
    header: 'Вернуть демо-данные?',
    message: 'Все локальные изменения будут потеряны и вернутся 10 демо-игр.',
    icon: 'pi pi-replay',
    acceptProps: { label: 'Вернуть демо', severity: 'warn' },
    accept: async () => {
      resetting.value = true
      try {
        await resetToDemo()
        await refresh()
        toast.add({ severity: 'success', summary: 'Демо-данные восстановлены', life: 2600 })
      } finally {
        resetting.value = false
      }
    }
  })
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <header class="admin-head">
        <div>
          <p class="admin-head__eyebrow">панель владельца</p>
          <h1 class="admin-head__title">Дневник игр</h1>
          <p class="muted admin-head__subtitle">
            Здесь добавляются записи о пройденных играх. Посетителям эта страница не нужна.
          </p>
        </div>

        <div v-if="isOwner" class="admin-head__actions">
          <Button label="Добавить игру" icon="pi pi-plus" @click="openCreate" />
          <Button
            v-if="isDemoBackend"
            label="Демо-данные"
            icon="pi pi-replay"
            outlined
            severity="secondary"
            :loading="resetting"
            v-tooltip.bottom="'Восстановить исходные 10 игр'"
            @click="askReset"
          />
          <Button
            label="Выйти"
            icon="pi pi-sign-out"
            text
            severity="secondary"
            @click="doSignOut"
          />
        </div>
      </header>

      <LoginPanel v-if="!isOwner" @success="onLogin" />

      <template v-else>
        <Message v-if="isDemoBackend" severity="secondary" :closable="false">
          Этап 0: записи хранятся только в этом браузере (localStorage). Подключение Supabase —
          следующий этап, после него дневник станет общим для всех.
        </Message>

        <div class="mini-stats">
          <div class="mini-stat surface">
            <span class="mini-stat__value">{{ allGames.length }}</span>
            <span class="mini-stat__label muted">всего записей</span>
          </div>
          <div class="mini-stat surface">
            <span class="mini-stat__value">{{ stats.count }}</span>
            <span class="mini-stat__label muted">опубликовано</span>
          </div>
          <div class="mini-stat surface">
            <span class="mini-stat__value">{{ draftCount }}</span>
            <span class="mini-stat__label muted">черновиков</span>
          </div>
          <div class="mini-stat surface">
            <span class="mini-stat__value">{{ stats.average }}</span>
            <span class="mini-stat__label muted">средняя оценка</span>
          </div>
        </div>

        <DataTable
          v-if="allGames.length"
          :value="allGames"
          data-key="id"
          :loading="loading"
          size="small"
          scrollable
          class="admin-table surface"
        >
          <Column header="Игра" style="min-width: 220px">
            <template #body="{ data }">
              <div class="cell-game">
                <RouterLink
                  :to="{ name: 'game', params: { slug: data.slug } }"
                  class="cell-game__title"
                >
                  {{ data.title }}
                </RouterLink>
                <span class="cell-game__meta muted">
                  {{ data.platform }}<template v-if="data.genre"> · {{ data.genre }}</template>
                </span>
              </div>
            </template>
          </Column>

          <Column header="Оценка" style="width: 104px">
            <template #body="{ data }">
              <RatingBadge :rating="data.rating" size="sm" />
            </template>
          </Column>

          <Column header="Дата" style="width: 168px">
            <template #body="{ data }">
              <div class="cell-date">
                <span>{{ formatDate(data.completedAt) }}</span>
                <span v-if="data.hours" class="muted">{{ formatHours(data.hours) }}</span>
              </div>
            </template>
          </Column>

          <Column header="Статус" style="width: 132px">
            <template #body="{ data }">
              <Tag v-if="data.published" value="Опубликовано" severity="success" />
              <Tag v-else value="Черновик" severity="warn" />
            </template>
          </Column>

          <Column header="" style="width: 108px">
            <template #body="{ data }">
              <div class="cell-actions">
                <Button
                  v-tooltip.top="'Редактировать'"
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  severity="secondary"
                  aria-label="Редактировать"
                  @click="openEdit(data)"
                />
                <Button
                  v-tooltip.top="'Удалить'"
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  aria-label="Удалить"
                  @click="askDelete(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>

        <EmptyState
          v-else-if="!loading"
          icon="pi pi-inbox"
          title="В дневнике нет ни одной записи"
          text="Добавь первую игру — она сразу появится на главной."
        >
          <Button label="Добавить игру" icon="pi pi-plus" @click="openCreate" />
        </EmptyState>

      </template>
    </div>

    <GameFormDialog v-if="isOwner" v-model="formVisible" :game="editing" @saved="onSaved" />
  </div>
</template>

<style scoped>
.admin-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
}

.admin-head__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-accent);
  margin-bottom: 6px;
}

.admin-head__title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
}

.admin-head__subtitle {
  font-size: 0.9rem;
  max-width: 52ch;
  margin-top: 6px;
}

.admin-head__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
}

.mini-stat__value {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.mini-stat__label {
  font-size: 0.78rem;
}

.admin-table {
  overflow: hidden;
}

.cell-game {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell-game__title {
  font-weight: 600;
}

.cell-game__title:hover {
  color: var(--app-accent);
}

.cell-game__meta {
  font-size: 0.76rem;
}

.cell-date {
  display: flex;
  flex-direction: column;
  font-size: 0.84rem;
}

.cell-date .muted {
  font-size: 0.76rem;
}

.cell-actions {
  display: flex;
  gap: 2px;
}

@media (max-width: 720px) {
  .mini-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-head {
    align-items: flex-start;
  }
}
</style>
