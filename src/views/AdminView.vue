<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Message from "primevue/message";
import LoginPanel from "../components/LoginPanel.vue";
import GameFormDialog from "../components/GameFormDialog.vue";
import RatingBadge from "../components/RatingBadge.vue";
import StatusBadge from "../components/StatusBadge.vue";
import ScrollTopButton from "../components/ScrollTopButton.vue";
import EmptyState from "../components/EmptyState.vue";
import { useAuth } from "../composables/useAuth";
import { useGames } from "../composables/useGames";
import { formatCompletionDate, formatHours } from "../utils/format";
import { isLocalBackend } from "../config/site";

const route = useRoute();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const { isOwner, signOut } = useAuth();
const { allGames, loading, stats, ensureLoaded, deleteGame } = useGames();

const formVisible = ref(false);
const editing = ref(null);

const tableWrap = ref(null);
const tableScrollable = ref(false);
const tableDragging = ref(false);

const DRAG_THRESHOLD_PX = 5;

let tableResizeObserver = null;
let dragPointerId = null;
let dragContainer = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartScrollLeft = 0;
let dragMoved = false;
let suppressClick = false;

const draftCount = computed(
  () => allGames.value.filter((game) => !game.published).length,
);

const confirmAction = {
  rejectProps: { label: "Отмена", severity: "secondary", outlined: true },
};

onMounted(ensureLoaded);

watch(
  () => [isOwner.value, route.query.create],
  ([owner, create]) => {
    if (owner && create === "1") {
      openCreate();
      router.replace({ name: "admin" });
    }
  },
  { immediate: true },
);

watch(
  tableWrap,
  async (wrapper) => {
    tableResizeObserver?.disconnect();
    tableResizeObserver = null;
    tableScrollable.value = false;

    if (!wrapper) return;

    await nextTick();
    if (tableWrap.value !== wrapper) return;

    const container = wrapper.querySelector(".p-datatable-table-container");
    if (!(container instanceof HTMLElement)) return;

    const updateScrollable = () => {
      tableScrollable.value =
        container.scrollWidth > container.clientWidth + 1;
    };

    updateScrollable();

    if (typeof ResizeObserver === "undefined") return;

    tableResizeObserver = new ResizeObserver(updateScrollable);
    tableResizeObserver.observe(container);

    const table = container.querySelector(".p-datatable-table");
    if (table) tableResizeObserver.observe(table);
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
});

function openCreate() {
  editing.value = null;
  formVisible.value = true;
}

function openEdit(game) {
  editing.value = game;
  formVisible.value = true;
}

function onRowClick({ data }) {
  if (!data?.slug) return;

  router.push({ name: "game", params: { slug: data.slug } });
}

function onSaved(saved, wasEdit) {
  toast.add({
    severity: "success",
    summary: wasEdit ? "Изменения сохранены" : "Игра добавлена",
    detail: saved.title,
    life: 2600,
  });
}

function onLogin() {
  toast.add({
    severity: "success",
    summary: "Вход выполнен",
    detail: "Теперь можно добавлять и редактировать игры",
    life: 2600,
  });
}

async function doSignOut() {
  await signOut();
  toast.add({ severity: "secondary", summary: "Вы вышли", life: 2000 });
}

function askDelete(game) {
  confirm.require({
    ...confirmAction,
    header: "Удалить игру?",
    message: `«${game.title}» исчезнет из дневника. Действие необратимо.`,
    icon: "pi pi-exclamation-triangle",
    acceptProps: { label: "Удалить", severity: "danger" },
    accept: async () => {
      await deleteGame(game.id);
      toast.add({
        severity: "success",
        summary: "Игра удалена",
        detail: game.title,
        life: 2600,
      });
    },
  });
}

function findTableScrollContainer(target) {
  if (!(target instanceof Element)) return null;

  const table = target.closest(".p-datatable-table");
  const container = table?.closest(".p-datatable-table-container");

  return container instanceof HTMLElement ? container : null;
}

function resetTableDrag() {
  if (
    dragPointerId !== null &&
    tableWrap.value?.hasPointerCapture?.(dragPointerId)
  ) {
    tableWrap.value.releasePointerCapture(dragPointerId);
  }

  dragPointerId = null;
  dragContainer = null;
  dragMoved = false;
  tableDragging.value = false;
}

function onTablePointerDown(event) {
  if (event.pointerType !== "mouse" || event.button !== 0) return;

  suppressClick = false;

  const container = findTableScrollContainer(event.target);
  if (!container) return;
  if (container.scrollWidth <= container.clientWidth + 1) return;

  dragPointerId = event.pointerId;
  dragContainer = container;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartScrollLeft = container.scrollLeft;
  dragMoved = false;
}

function onTablePointerMove(event) {
  if (dragPointerId !== event.pointerId || !dragContainer) return;

  if ((event.buttons & 1) === 0) {
    resetTableDrag();
    return;
  }

  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;

  if (!dragMoved) {
    if (
      Math.abs(dx) < DRAG_THRESHOLD_PX ||
      Math.abs(dx) <= Math.abs(dy)
    ) {
      return;
    }

    dragMoved = true;
    tableDragging.value = true;
    window.getSelection()?.removeAllRanges();
    tableWrap.value?.setPointerCapture?.(dragPointerId);
  }

  event.preventDefault();

  const maxScrollLeft = dragContainer.scrollWidth - dragContainer.clientWidth;
  dragContainer.scrollLeft = Math.min(
    maxScrollLeft,
    Math.max(0, dragStartScrollLeft - dx),
  );
}

function onTablePointerUp(event) {
  if (dragPointerId !== event.pointerId) return;

  if (dragMoved) suppressClick = true;

  resetTableDrag();
}

function onTablePointerCancel(event) {
  if (dragPointerId !== event.pointerId) return;

  resetTableDrag();
}

function onTableClickCapture(event) {
  if (!suppressClick) return;

  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function onTableDragStart(event) {
  if (dragPointerId !== null) event.preventDefault();
}
</script>

<template>
  <div class="page">
    <div class="container stack">
      <header class="admin-head">
        <div>
          <p class="admin-head__eyebrow">панель админа</p>
          <h1 class="admin-head__title">Список игр</h1>
          <p class="muted admin-head__subtitle">
            Здесь добавляются записи об играх. Посетителям эта страница не
            нужна.
          </p>
        </div>

        <div v-if="isOwner" class="admin-head__actions">
          <Button label="Добавить игру" icon="pi pi-plus" @click="openCreate" />
          <Button
            label="Выйти"
            icon="pi pi-sign-out"
            outlined
            severity="danger"
            @click="doSignOut"
          />
        </div>
      </header>

      <LoginPanel v-if="!isOwner" @success="onLogin" />

      <template v-else>
        <Message v-if="isLocalBackend" severity="secondary" :closable="false">
          Локальный режим: записи хранятся только в этом браузере (localStorage)
          и не видны посетителям. Задайте VITE_SUPABASE_URL и
          VITE_SUPABASE_ANON_KEY, чтобы включить Supabase.
        </Message>
        <Message v-else severity="success" :closable="false">
          Записи хранятся в Supabase и сразу видны всем посетителям. Черновики
          видите только вы.
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
        </div>

        <div
          v-if="allGames.length"
          ref="tableWrap"
          class="admin-table-scroll"
          :class="{
            'is-scrollable': tableScrollable,
            'is-dragging': tableDragging,
          }"
          @pointerdown="onTablePointerDown"
          @pointermove="onTablePointerMove"
          @pointerup="onTablePointerUp"
          @pointercancel="onTablePointerCancel"
          @dragstart="onTableDragStart"
          @click.capture="onTableClickCapture"
        >
          <DataTable
            :value="allGames"
            data-key="id"
            :loading="loading"
            scrollable
            row-hover
            class="admin-table surface"
            @row-click="onRowClick"
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
                    {{ data.platform
                    }}<template v-if="data.genre"> · {{ data.genre }}</template>
                  </span>
                </div>
              </template>
            </Column>

            <Column header="Оценка" style="width: 104px">
              <template #body="{ data }">
                <RatingBadge :rating="data.rating" size="sm" />
              </template>
            </Column>

            <Column header="Дата прохождения" style="width: 176px">
              <template #body="{ data }">
                <div class="cell-date">
                  <span :class="{ muted: !data.completedAt }">
                    {{ formatCompletionDate(data.completedAt) }}
                  </span>
                  <span v-if="data.hours" class="muted">{{
                    formatHours(data.hours)
                  }}</span>
                </div>
              </template>
            </Column>

            <Column header="Статус" style="width: 144px">
              <template #body="{ data }">
                <StatusBadge :status="data.status" variant="inline" />
              </template>
            </Column>

            <Column header="Публикация" style="width: 140px">
              <template #body="{ data }">
                <Tag
                  v-if="data.published"
                  value="Опубликовано"
                  severity="success"
                />
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
                    @pointerdown.stop
                    @click.stop="openEdit(data)"
                  />
                  <Button
                    v-tooltip.top="'Удалить'"
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    aria-label="Удалить"
                    @pointerdown.stop
                    @click.stop="askDelete(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

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

    <GameFormDialog
      v-if="isOwner"
      v-model="formVisible"
      :game="editing"
      @saved="onSaved"
    />

    <ScrollTopButton />
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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

.admin-table-scroll.is-scrollable {
  cursor: grab;
}

.admin-table-scroll.is-dragging,
.admin-table-scroll.is-dragging :deep(*) {
  cursor: grabbing !important;
  user-select: none;
}

.admin-table :deep(.p-datatable-table) {
  width: 100%;
  min-width: 900px;
  table-layout: fixed;
}

.admin-table :deep(.p-datatable-table-container) {
  /* В Firefox не показываем широкую системную полосу: прокрутка остаётся
     доступной колесом/трекпадом, а внешний вид таблицы не страдает. */
  scrollbar-width: none;
}

@supports selector(::-webkit-scrollbar) {
  .admin-table :deep(.p-datatable-table-container) {
    scrollbar-width: auto;
  }

  .admin-table :deep(.p-datatable-table-container::-webkit-scrollbar) {
    width: 4px;
    height: 4px;
  }

  .admin-table :deep(.p-datatable-table-container::-webkit-scrollbar-track) {
    background: transparent;
  }

  .admin-table :deep(.p-datatable-table-container::-webkit-scrollbar-thumb) {
    border-radius: 999px;
    background: transparent;
  }

  .admin-table :deep(.p-datatable-table-container:hover::-webkit-scrollbar-thumb) {
    background: var(--app-border);
  }

  .admin-table :deep(.p-datatable-table-container::-webkit-scrollbar-thumb:hover) {
    background: var(--app-text-muted);
  }
}

.admin-table :deep(.p-datatable-header-cell) {
  padding: 12px 18px;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  border-bottom: 1px solid var(--app-border);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  text-align: left;
}

.admin-table :deep(.p-datatable-column-title) {
  font-weight: 700;
}

.admin-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.admin-table :deep(.p-datatable-tbody > tr > td) {
  padding: 12px 18px;
  border-bottom: 1px solid var(--app-border);
  vertical-align: middle;
}

.admin-table :deep(.p-datatable-tbody > tr:last-child > td) {
  border-bottom: 0;
}

.admin-table :deep(.p-datatable-tbody > tr:hover > td) {
  background: var(--app-surface-2);
}

.cell-game {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.cell-game__title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-game__title:hover {
  color: var(--app-accent);
}

.cell-game__meta {
  overflow: hidden;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-date {
  display: flex;
  flex-direction: column;
  font-size: 0.84rem;
  white-space: nowrap;
}

.cell-date .muted {
  font-size: 0.76rem;
}

.admin-table :deep(.p-tag) {
  white-space: nowrap;
}

.cell-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

@media (max-width: 720px) {
  .admin-head {
    align-items: flex-start;
  }
}
</style>
