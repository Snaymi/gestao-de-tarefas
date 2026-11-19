<script setup lang="ts">
import BaseButton from '../atoms/BaseButton.vue';
import { useDialogFocus } from '../../composables/useDialogFocus';
defineProps<{ title: string; message: string; loading?: boolean }>();
defineEmits<{ confirm: []; cancel: [] }>();
const { dialog, trap } = useDialogFocus();
</script>
<template><div class="modal-backdrop" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')"><div ref="dialog" class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" @keydown="trap"><h2 id="confirm-title">{{ title }}</h2><p id="confirm-message" class="muted">{{ message }}</p><div class="modal-actions"><BaseButton variant="secondary" @click="$emit('cancel')">Cancelar</BaseButton><BaseButton variant="danger" :loading="loading" @click="$emit('confirm')">Excluir tarefa</BaseButton></div></div></div></template>
