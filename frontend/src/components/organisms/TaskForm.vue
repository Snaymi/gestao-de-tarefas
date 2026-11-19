<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Task, User } from '../../types';
import BaseButton from '../atoms/BaseButton.vue';
import BaseInput from '../atoms/BaseInput.vue';
import { useDialogFocus } from '../../composables/useDialogFocus';
const props = defineProps<{ task?: Task | null; users?: User[]; isAdmin?: boolean; loading?: boolean; error?: string }>();
const emit = defineEmits<{ save: [value: { title: string; description: string; ownerId?: string }]; cancel: [] }>();
const title = ref(''); const description = ref(''); const ownerId = ref('');
const { dialog, trap } = useDialogFocus();
watch(() => props.task, value => { title.value = value?.title || ''; description.value = value?.description || ''; ownerId.value = value?.ownerId || ''; }, { immediate: true });
function submit() { if (title.value.trim()) emit('save', { title: title.value.trim(), description: description.value.trim(), ...(props.isAdmin && ownerId.value ? { ownerId: ownerId.value } : {}) }); }
</script>
<template><div class="modal-backdrop" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')"><div ref="dialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title" @keydown="trap"><h2 id="task-form-title">{{ task ? 'Editar tarefa' : 'Nova tarefa' }}</h2><p class="muted">{{ task ? 'Atualize as informações desta tarefa.' : 'Organize o que precisa ser feito.' }}</p><form class="stack" @submit.prevent="submit"><BaseInput id="task-title" v-model="title" label="Título" placeholder="Ex.: Revisar proposta" required /><div class="field"><label for="task-description">Descrição <span class="muted">(opcional)</span></label><textarea id="task-description" v-model="description" class="input" rows="4" placeholder="Adicione detalhes para esta tarefa"></textarea></div><div v-if="isAdmin && users?.length" class="field"><label for="task-owner">Responsável</label><select id="task-owner" v-model="ownerId" class="input"><option value="">Minha conta</option><option v-for="user in users.filter(item => item.active !== false)" :key="user.id" :value="user.id">{{ user.name }}</option></select></div><p v-if="error" class="error-text" role="alert">{{ error }}</p><div class="modal-actions"><BaseButton variant="secondary" @click="$emit('cancel')">Cancelar</BaseButton><BaseButton type="submit" :loading="loading" :disabled="!title.trim()">{{ task ? 'Salvar alterações' : 'Criar tarefa' }}</BaseButton></div></form></div></div></template>
