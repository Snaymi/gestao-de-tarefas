<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Plus, RefreshCw } from '@lucide/vue';
import type { Role, User } from '../types';
import { api } from '../services/api';
import { useSession } from '../stores/session';
import { useToast } from '../composables/useToast';
import BaseButton from '../components/atoms/BaseButton.vue';
import UsersTable from '../components/organisms/UsersTable.vue';
import UserForm from '../components/organisms/UserForm.vue';
const session = useSession(); const { show } = useToast();
const users = ref<User[]>([]); const loading = ref(true); const error = ref(''); const formError = ref(''); const formOpen = ref(false); const editing = ref<User | null>(null); const saving = ref(false);
async function load() { loading.value = true; error.value = ''; try { users.value = await api.users(); } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Erro ao carregar usuários.'; } finally { loading.value = false; } }
function openForm(user: User | null = null) { editing.value = user; formError.value = ''; formOpen.value = true; }
async function save(value: { name: string; email: string; password: string; role: Role }) { saving.value = true; formError.value = ''; try { if (editing.value) await api.updateUser(editing.value.id, { name: value.name, role: value.role }); else await api.createUser(value); formOpen.value = false; show(editing.value ? 'Usuário atualizado.' : 'Usuário cadastrado.'); await load(); } catch (cause) { formError.value = cause instanceof Error ? cause.message : 'Erro ao salvar usuário.'; } finally { saving.value = false; } }
async function toggle(user: User) { if (user.id === session.user?.id) { show('Você não pode desativar sua própria conta.', 'error'); return; } try { await api.updateUser(user.id, { active: user.active === false }); show(user.active === false ? 'Usuário ativado.' : 'Usuário desativado.'); await load(); } catch (cause) { show(cause instanceof Error ? cause.message : 'Erro ao atualizar usuário.', 'error'); } }
onMounted(load);
</script>
<template><div class="page-head"><div><p class="eyebrow">ADMINISTRAÇÃO</p><h1>Usuários</h1><p class="muted">Gerencie o acesso e os perfis da equipe.</p></div><BaseButton @click="openForm()"><Plus :size="18"/> Novo usuário</BaseButton></div><div v-if="error" class="panel panel-pad error-panel"><p>{{ error }}</p><BaseButton variant="secondary" @click="load"><RefreshCw :size="16"/> Tentar novamente</BaseButton></div><UsersTable v-else :users="users" :loading="loading" @edit="openForm" @toggle="toggle"/><Transition name="fade"><UserForm v-if="formOpen" :user="editing" :loading="saving" :error="formError" @save="save" @cancel="formOpen = false"/></Transition></template>
<style scoped>.error-panel p{color:var(--danger)}</style>
