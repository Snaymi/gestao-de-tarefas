<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Role, User } from '../../types';
import BaseInput from '../atoms/BaseInput.vue';
import BaseButton from '../atoms/BaseButton.vue';
import { useDialogFocus } from '../../composables/useDialogFocus';
const props = defineProps<{ user?: User | null; loading?: boolean; error?: string }>();
const emit = defineEmits<{ save: [value: { name: string; email: string; password: string; role: Role }]; cancel: [] }>();
const name = ref(''); const email = ref(''); const password = ref(''); const role = ref<Role>('USER');
const { dialog, trap } = useDialogFocus();
watch(() => props.user, value => { name.value = value?.name || ''; email.value = value?.email || ''; password.value = ''; role.value = value?.role || 'USER'; }, { immediate: true });
function submit() { emit('save', { name: name.value.trim(), email: email.value.trim(), password: password.value, role: role.value }); }
</script>
<template><div class="modal-backdrop" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')"><div ref="dialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title" @keydown="trap"><h2 id="user-form-title">{{ user ? 'Editar usuário' : 'Novo usuário' }}</h2><p class="muted">{{ user ? 'Atualize o nome e as permissões.' : 'Cadastre uma pessoa na equipe.' }}</p><form class="stack" @submit.prevent="submit"><BaseInput id="user-name" v-model="name" label="Nome" required autocomplete="name"/><template v-if="!user"><BaseInput id="user-email" v-model="email" label="E-mail" type="email" required autocomplete="email"/><BaseInput id="user-password" v-model="password" label="Senha (mínimo 8 caracteres)" type="password" required autocomplete="new-password"/></template><div class="field"><label for="user-role">Perfil</label><select id="user-role" v-model="role" class="input"><option value="USER">Usuário</option><option value="ADMIN">Administrador</option></select></div><p v-if="error" class="error-text" role="alert">{{ error }}</p><div class="modal-actions"><BaseButton variant="secondary" @click="$emit('cancel')">Cancelar</BaseButton><BaseButton type="submit" :loading="loading" :disabled="!name.trim() || (!user && (!email.trim() || password.length < 8))">{{ user ? 'Salvar alterações' : 'Cadastrar usuário' }}</BaseButton></div></form></div></div></template>
