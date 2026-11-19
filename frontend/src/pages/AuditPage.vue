<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, Search } from '@lucide/vue';
import type { AuditAction, AuditLogPageResult } from '../types';
import { auditActionOptions } from '../utils/audit';
import { api } from '../services/api';
import BaseButton from '../components/atoms/BaseButton.vue';
import AuditLogTable from '../components/organisms/AuditLogTable.vue';

const result = ref<AuditLogPageResult | null>(null);
const search = ref('');
const action = ref<AuditAction | ''>('');
const page = ref(1);
const loading = ref(true);
const error = ref('');
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

const rangeStart = computed(() => result.value?.total ? (page.value - 1) * (result.value?.pageSize ?? 10) + 1 : 0);
const rangeEnd = computed(() => Math.min(page.value * (result.value?.pageSize ?? 10), result.value?.total ?? 0));

async function load() {
  const currentRequest = ++requestId;
  loading.value = true;
  error.value = '';

  try {
    const response = await api.auditLogs(search.value, action.value, page.value);
    if (currentRequest !== requestId) return;
    page.value = response.page;
    result.value = response;
  } catch (cause) {
    if (currentRequest !== requestId) return;
    error.value = cause instanceof Error ? cause.message : 'Erro ao carregar a auditoria.';
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

watch(action, () => {
  page.value = 1;
  void load();
});

watch(search, () => {
  page.value = 1;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void load(), 300);
});

function changePage(nextPage: number) {
  if (loading.value || nextPage < 1 || nextPage > (result.value?.totalPages ?? 0)) return;
  page.value = nextPage;
  void load();
}

onMounted(() => void load());
onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="page-head">
    <div>
      <p class="eyebrow">ADMINISTRAÇÃO</p>
      <h1>Auditoria</h1>
      <p class="muted">Acompanhe quem fez cada alteração e quando ela aconteceu.</p>
    </div>
    <BaseButton variant="secondary" :loading="loading" aria-label="Atualizar auditoria" @click="load">
      <RefreshCw v-if="!loading" :size="17" /> Atualizar
    </BaseButton>
  </div>

  <div class="toolbar audit-toolbar">
    <label class="search-wrap">
      <Search :size="18" aria-hidden="true" />
      <input v-model="search" class="input" type="search" aria-label="Pesquisar atividades" placeholder="Pesquisar pessoa ou atividade..." />
    </label>
    <select v-model="action" class="input action-filter" aria-label="Filtrar por atividade">
      <option value="">Todas as atividades</option>
      <option v-for="[value, label] in auditActionOptions" :key="value" :value="value">{{ label }}</option>
    </select>
  </div>

  <div v-if="error" class="panel panel-pad error-panel" role="alert">
    <p>{{ error }}</p>
    <BaseButton variant="secondary" :loading="loading" @click="load"><RefreshCw :size="16" /> Tentar novamente</BaseButton>
  </div>
  <template v-else>
    <p class="result-count" aria-live="polite">
      <ClipboardList :size="16" />
      {{ result?.total ?? 0 }} {{ (result?.total ?? 0) === 1 ? 'atividade registrada' : 'atividades registradas' }}
    </p>
    <AuditLogTable :entries="result?.items ?? []" :loading="loading" />
    <footer v-if="(result?.totalPages ?? 0) > 0" class="pagination">
      <span>Exibindo {{ rangeStart }}–{{ rangeEnd }} de {{ result?.total }}</span>
      <div class="pagination-actions">
        <BaseButton variant="secondary" :disabled="loading || page <= 1" aria-label="Página anterior" @click="changePage(page - 1)"><ChevronLeft :size="17" /> Anterior</BaseButton>
        <span class="page-number">{{ page }} / {{ result?.totalPages }}</span>
        <BaseButton variant="secondary" :disabled="loading || page >= (result?.totalPages ?? 0)" aria-label="Próxima página" @click="changePage(page + 1)">Próxima <ChevronRight :size="17" /></BaseButton>
      </div>
    </footer>
  </template>
</template>

<style scoped>
.audit-toolbar { margin-bottom: 14px; }
.search-wrap { position: relative; flex: 1; min-width: 220px; }
.search-wrap svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-wrap .input { padding-left: 41px; }
.action-filter { width: min(260px, 100%); }
.result-count { display: flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: 12px; margin: 0 0 12px; }
.error-panel { display: grid; justify-items: start; gap: 8px; }
.error-panel p { color: var(--danger); margin: 0; }
.pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 18px; color: var(--text-muted); font-size: 12px; }
.pagination-actions { display: flex; align-items: center; gap: 9px; }
.pagination-actions .btn { min-height: 36px; padding: 7px 10px; font-size: 12px; }
.page-number { min-width: 46px; text-align: center; font-variant-numeric: tabular-nums; }
@media (max-width: 600px) {
  .search-wrap { min-width: 100%; }
  .action-filter { width: 100%; }
  .pagination { align-items: flex-start; }
  .pagination-actions { width: 100%; justify-content: space-between; }
  .pagination-actions .btn { flex: 1; }
}
</style>
