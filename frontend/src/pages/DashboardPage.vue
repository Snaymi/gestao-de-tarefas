<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ArrowRight, Plus, RefreshCw } from '@lucide/vue';
import { useRouter } from 'vue-router';
import type { Summary } from '../types';
import { api } from '../services/api';
import { useSession } from '../stores/session';
import { useToast } from '../composables/useToast';
import DashboardStats from '../components/organisms/DashboardStats.vue';
import TaskList from '../components/organisms/TaskList.vue';
import BaseButton from '../components/atoms/BaseButton.vue';
const session = useSession(); const router = useRouter(); const { show } = useToast();
const summary = ref<Summary | null>(null); const loading = ref(true); const refreshing = ref(false); const error = ref('');
async function load() { loading.value = true; error.value = ''; try { summary.value = await api.summary(); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Erro ao carregar dashboard.'; } finally { loading.value = false; } }
async function refreshDashboard() {
  if (loading.value || refreshing.value || !summary.value) return;

  refreshing.value = true;
  try {
    const updatedSummary = await api.summary();
    const changed = JSON.stringify(summary.value) !== JSON.stringify(updatedSummary);
    summary.value = updatedSummary;
    show(changed ? 'Painel atualizado com novas informações.' : 'Tudo atualizado; nenhuma mudança encontrada.');
  } catch (cause) {
    show(cause instanceof Error ? cause.message : 'Erro ao atualizar o painel.', 'error');
  } finally {
    refreshing.value = false;
  }
}
onMounted(load);
</script>
<template><div class="page-head"><div><p class="eyebrow">SEU PAINEL</p><h1>Olá, {{ session.user?.name.split(' ')[0] }} 👋</h1><p class="muted">Aqui está o panorama das suas tarefas.</p></div><BaseButton @click="router.push('/tarefas?nova=1')"><Plus :size="18"/> Nova tarefa</BaseButton></div><div v-if="error" class="panel panel-pad error-panel"><p>{{ error }}</p><BaseButton variant="secondary" :loading="loading" @click="load"><RefreshCw :size="16"/> Tentar novamente</BaseButton></div><template v-else><DashboardStats :summary="summary" :loading="loading"/><section class="recent"><div class="section-title"><div><h2>Atividade recente</h2><p class="muted">As últimas tarefas registradas.</p></div><div class="section-actions"><BaseButton class="refresh-button" variant="ghost" :disabled="loading" :loading="refreshing" aria-label="Atualizar atividade recente" title="Atualizar atividade recente" @click="refreshDashboard"><RefreshCw v-if="!refreshing" :size="16"/> Atualizar</BaseButton><RouterLink to="/tarefas" class="view-all">Ver todas <ArrowRight :size="16"/></RouterLink></div></div><TaskList :tasks="summary?.recent || []" :loading="loading" @edit="router.push('/tarefas')" @complete="router.push('/tarefas')" @remove="router.push('/tarefas')"/></section></template></template>
<style scoped>.recent{margin-top:36px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:17px}.section-title h2{font-size:20px;letter-spacing:-.025em;margin-bottom:4px}.section-title p{font-size:13px;margin-bottom:0}.section-actions{display:flex;align-items:center;gap:12px}.refresh-button{min-height:36px;padding:7px 10px;font-size:13px}.view-all{display:flex;align-items:center;gap:6px;color:var(--accent);font-size:13px;font-weight:700;white-space:nowrap}.error-panel p{color:var(--danger)}@media(max-width:600px){.section-title{align-items:flex-start}.section-title h2{font-size:18px}.section-actions{gap:8px}}</style>
