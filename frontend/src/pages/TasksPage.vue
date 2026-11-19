<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Search, RefreshCw } from '@lucide/vue';
import type { Task, User } from '../types';
import { api } from '../services/api';
import { useSession } from '../stores/session';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/atoms/BaseButton.vue';
import TaskList from '../components/organisms/TaskList.vue';
import TaskForm from '../components/organisms/TaskForm.vue';
import ConfirmDialog from '../components/molecules/ConfirmDialog.vue';
const session = useSession(); const route = useRoute(); const router = useRouter(); const { show } = useToast();
const tasks = ref<Task[]>([]); const users = ref<User[]>([]); const loading = ref(true); const error = ref(''); const search = ref(''); const status = ref(''); const busyId = ref(''); const saving = ref(false); const formOpen = ref(false); const editing = ref<Task | null>(null); const deleting = ref<Task | null>(null); const formError = ref('');
let searchTimer: ReturnType<typeof setTimeout>;
async function load() { loading.value = true; error.value = ''; try { tasks.value = await api.tasks(search.value, status.value); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Erro ao carregar tarefas.'; } finally { loading.value = false; } }
watch([search, status], () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 250); });
function openForm(task: Task | null = null) { editing.value = task; formError.value = ''; formOpen.value = true; }
async function save(value: { title: string; description: string; ownerId?: string }) { saving.value = true; formError.value = ''; try { if (editing.value) await api.updateTask(editing.value.id, value); else await api.createTask(value); formOpen.value = false; show(editing.value ? 'Tarefa atualizada.' : 'Tarefa criada.'); await load(); } catch (cause) { formError.value = cause instanceof Error ? cause.message : 'Erro ao salvar tarefa.'; } finally { saving.value = false; } }
async function complete(task: Task) { busyId.value = task.id; try { await api.completeTask(task.id); show('Tarefa concluída.'); await load(); } catch (cause) { show(cause instanceof Error ? cause.message : 'Erro ao concluir tarefa.', 'error'); } finally { busyId.value = ''; } }
async function remove() { if (!deleting.value) return; busyId.value = deleting.value.id; try { await api.deleteTask(deleting.value.id); deleting.value = null; show('Tarefa excluída.'); await load(); } catch (cause) { show(cause instanceof Error ? cause.message : 'Erro ao excluir tarefa.', 'error'); deleting.value = null; await load(); } finally { busyId.value = ''; } }
onMounted(async () => { await load(); if (session.user?.role === 'ADMIN') { try { users.value = await api.users(); } catch { show('Não foi possível carregar os responsáveis.', 'error'); } } if (route.query.nova === '1') { openForm(); router.replace('/tarefas'); } });
</script>
<template><div class="page-head"><div><p class="eyebrow">ORGANIZAÇÃO</p><h1>Tarefas</h1><p class="muted">Acompanhe e gerencie o trabalho em um só lugar.</p></div><BaseButton @click="openForm()"><Plus :size="18"/> Nova tarefa</BaseButton></div><div class="toolbar"><div class="search-wrap"><Search :size="18"/><input v-model="search" class="input" type="search" aria-label="Pesquisar tarefas" placeholder="Pesquisar por título..."/></div><select v-model="status" class="input status-filter" aria-label="Filtrar por status"><option value="">Todos os status</option><option value="PENDING">Pendentes</option><option value="COMPLETED">Concluídas</option></select></div><div v-if="error" class="panel panel-pad error-panel"><p>{{ error }}</p><BaseButton variant="secondary" @click="load"><RefreshCw :size="16"/> Tentar novamente</BaseButton></div><TaskList v-else :tasks="tasks" :loading="loading" :busy-id="busyId" @edit="openForm" @complete="complete" @remove="deleting = $event"/><Transition name="fade"><TaskForm v-if="formOpen" :task="editing" :users="users" :is-admin="session.user?.role === 'ADMIN'" :loading="saving" :error="formError" @save="save" @cancel="formOpen = false"/></Transition><Transition name="fade"><ConfirmDialog v-if="deleting" title="Excluir tarefa?" :message="`A tarefa '${deleting.title}' será excluída permanentemente.`" :loading="!!busyId" @confirm="remove" @cancel="deleting = null"/></Transition></template>
<style scoped>.search-wrap{position:relative;flex:1;min-width:220px}.search-wrap svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-muted)}.search-wrap .input{padding-left:41px}.status-filter{width:190px}.error-panel p{color:var(--danger)}@media(max-width:600px){.search-wrap{min-width:0}.status-filter{width:100%}}</style>
