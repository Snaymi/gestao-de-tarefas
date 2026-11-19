<script setup lang="ts">
import { ref } from 'vue';
import { ChevronRight, Pencil, UserRound } from '@lucide/vue';
import type { User } from '../../types';
import BaseButton from '../atoms/BaseButton.vue';
import BaseSkeleton from '../atoms/BaseSkeleton.vue';
import RecordDetailsDialog from '../molecules/RecordDetailsDialog.vue';
import ResponsiveDataTable from '../molecules/ResponsiveDataTable.vue';

defineProps<{ users: User[]; loading?: boolean }>();
const emit = defineEmits<{ edit: [user: User]; toggle: [user: User] }>();
const selectedUser = ref<User | null>(null);

function roleLabel(user: User) {
  return user.role === 'ADMIN' ? 'Administrador' : 'Usuário';
}

function statusLabel(user: User) {
  return user.active === false ? 'Inativo' : 'Ativo';
}

function userFields(user: User) {
  return [
    { label: 'E-mail', value: user.email },
    { label: 'Perfil', value: roleLabel(user) },
    { label: 'Status', value: statusLabel(user) },
    ...(user.createdAt ? [{
      label: 'Cadastrado em',
      value: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(user.createdAt))
    }] : [])
  ];
}

function editSelectedUser() {
  if (!selectedUser.value) return;
  const user = selectedUser.value;
  selectedUser.value = null;
  emit('edit', user);
}

function toggleSelectedUser() {
  if (!selectedUser.value) return;
  const user = selectedUser.value;
  selectedUser.value = null;
  emit('toggle', user);
}
</script>

<template>
  <div class="panel users-panel">
    <div v-if="loading" class="stack panel-pad" aria-label="Carregando usuários">
      <BaseSkeleton v-for="item in 4" :key="item" height="52px" />
    </div>
    <div v-else-if="!users.length" class="empty">
      <UserRound :size="35" />
      <h3>Nenhum usuário cadastrado</h3>
    </div>
    <ResponsiveDataTable v-else label="Tabela de usuários">
      <template #desktop>
        <table class="users-table" aria-label="Usuários cadastrados">
          <thead>
            <tr>
              <th scope="col">Usuário</th>
              <th scope="col">Perfil</th>
              <th scope="col">Status</th>
              <th scope="col" class="actions-col">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="user-cell">
                  <span class="avatar" aria-hidden="true">{{ user.name.slice(0, 1).toUpperCase() }}</span>
                  <span class="user-copy"><strong>{{ user.name }}</strong><small>{{ user.email }}</small></span>
                </div>
              </td>
              <td><span class="role-pill">{{ user.role === 'ADMIN' ? 'Admin' : 'Usuário' }}</span></td>
              <td><span :class="user.active === false ? 'inactive' : 'active'">{{ statusLabel(user) }}</span></td>
              <td class="actions-col">
                <button class="btn btn-ghost icon-btn" :aria-label="`Editar ${user.name}`" @click="emit('edit', user)">
                  <Pencil :size="16" />
                </button>
                <button class="btn btn-ghost toggle-btn" @click="emit('toggle', user)">
                  {{ user.active === false ? 'Ativar' : 'Desativar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <template #mobile>
        <div class="mobile-user-list" role="list" aria-label="Usuários">
          <article v-for="user in users" :key="user.id" class="mobile-user-item" role="listitem">
            <button
              class="mobile-user-summary"
              type="button"
              :aria-label="`Ver detalhes de ${user.name}`"
              aria-haspopup="dialog"
              @click="selectedUser = user"
            >
              <span class="avatar mobile-avatar" aria-hidden="true">{{ user.name.slice(0, 1).toUpperCase() }}</span>
              <span class="mobile-user-copy">
                <strong>{{ user.name }}</strong>
                <small>{{ user.email }}</small>
                <span class="mobile-user-badges">
                  <span class="role-pill">{{ user.role === 'ADMIN' ? 'Admin' : 'Usuário' }}</span>
                  <span class="mobile-status" :class="user.active === false ? 'inactive' : 'active'">{{ statusLabel(user) }}</span>
                </span>
              </span>
              <ChevronRight class="mobile-user-chevron" :size="19" aria-hidden="true" />
            </button>
          </article>
        </div>
      </template>
    </ResponsiveDataTable>

    <RecordDetailsDialog
      v-if="selectedUser"
      :title="selectedUser.name"
      subtitle="Detalhes do usuário"
      :fields="userFields(selectedUser)"
      @close="selectedUser = null"
    >
      <template #actions>
        <BaseButton variant="secondary" @click="toggleSelectedUser">
          {{ selectedUser.active === false ? 'Ativar usuário' : 'Desativar usuário' }}
        </BaseButton>
        <BaseButton @click="editSelectedUser">Editar usuário</BaseButton>
      </template>
    </RecordDetailsDialog>
  </div>
</template>

<style scoped>
.users-panel { overflow: hidden; }
.users-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.users-table th { background: var(--surface-muted); color: var(--text-muted); font-size: 11px; letter-spacing: .07em; padding: 15px 20px; text-align: left; text-transform: uppercase; }
.users-table th:first-child { width: 43%; }
.users-table th:nth-child(2), .users-table th:nth-child(3) { width: 17%; }
.users-table th.actions-col { width: 23%; text-align: right; }
.users-table td { border-top: 1px solid var(--border); font-size: 13px; padding: 15px 20px; }
.actions-col { text-align: right; white-space: nowrap; }
.user-cell { align-items: center; display: flex; gap: 11px; min-width: 0; }
.user-copy { min-width: 0; }
.user-copy strong, .user-copy small { display: block; overflow-wrap: anywhere; }
.user-copy small { color: var(--text-muted); font-size: 11px; margin-top: 3px; }
.avatar { align-items: center; background: var(--accent-soft); border-radius: 11px; color: var(--accent); display: grid; flex: none; font-weight: 800; height: 37px; justify-content: center; width: 37px; }
.role-pill { background: var(--accent-soft); border-radius: 20px; color: var(--accent); display: inline-flex; font-size: 11px; font-weight: 700; padding: 5px 9px; }
.active { color: var(--success); }
.inactive { color: var(--text-muted); }
.toggle-btn { font-size: 12px; padding: 6px 8px; }
.mobile-user-list { display: grid; gap: 9px; padding: 11px; }
.mobile-user-item { min-width: 0; }
.mobile-user-summary { align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 15px; color: var(--text); display: grid; gap: 11px; grid-template-columns: auto minmax(0, 1fr) auto; padding: 13px; text-align: left; transition: background var(--ease), border-color var(--ease); width: 100%; }
.mobile-user-summary:hover, .mobile-user-summary:focus-visible { background: var(--surface-muted); border-color: var(--accent); }
.mobile-avatar { height: 42px; width: 42px; }
.mobile-user-copy { display: grid; gap: 3px; min-width: 0; }
.mobile-user-copy strong { font-size: 14px; overflow-wrap: anywhere; }
.mobile-user-copy small { color: var(--text-muted); font-size: 11px; overflow-wrap: anywhere; }
.mobile-user-badges { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
.mobile-status { font-size: 11px; font-weight: 650; }
.mobile-user-chevron { color: var(--text-muted); }

@media (max-width: 1100px) {
  .users-table th, .users-table td { padding-inline: 14px; }
  .users-table th:first-child { width: auto; }
  .users-table th.actions-col { width: 145px; }
}

@media (max-width: 700px) {
  .mobile-user-list { padding: 12px; }
}
</style>
