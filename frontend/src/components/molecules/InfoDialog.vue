<script setup lang="ts">
import BaseButton from '../atoms/BaseButton.vue';
import { useDialogFocus } from '../../composables/useDialogFocus';

withDefaults(defineProps<{ title: string; message: string; closeLabel?: string }>(), { closeLabel: 'Fechar' });
defineEmits<{ close: [] }>();

const { dialog, trap } = useDialogFocus();
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div
      ref="dialog"
      class="modal info-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-dialog-title"
      aria-describedby="info-dialog-message"
      @keydown="trap"
    >
      <h2 id="info-dialog-title">{{ title }}</h2>
      <p id="info-dialog-message" class="muted info-dialog-message">{{ message }}</p>
      <div class="modal-actions info-dialog-actions">
        <BaseButton @click="$emit('close')">{{ closeLabel }}</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-dialog-message {
  margin-top: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

@media (max-width: 480px) {
  .info-dialog {
    padding: 22px 18px;
  }

  .info-dialog-actions .btn {
    width: 100%;
  }
}
</style>
