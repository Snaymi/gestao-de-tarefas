<script setup lang="ts">
import { X } from '@lucide/vue';
import { useId } from 'vue';
import { useDialogFocus } from '../../composables/useDialogFocus';
import BaseButton from '../atoms/BaseButton.vue';

export interface RecordDetailField {
  label: string;
  value: string;
}

withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  fields: RecordDetailField[];
}>(), { subtitle: '' });

defineEmits<{ close: [] }>();

const { dialog, trap } = useDialogFocus();
const titleId = useId();
</script>

<template>
  <div class="modal-backdrop record-details-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section
      ref="dialog"
      class="modal record-details-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown="trap"
    >
      <header class="record-details-header">
        <div class="record-details-heading">
          <p v-if="subtitle" class="eyebrow">{{ subtitle }}</p>
          <h2 :id="titleId">{{ title }}</h2>
        </div>
        <button class="btn btn-ghost icon-btn record-details-close" type="button" aria-label="Fechar detalhes" @click="$emit('close')">
          <X :size="19" />
        </button>
      </header>

      <dl class="record-details-fields">
        <div v-for="field in fields" :key="field.label" class="record-details-field">
          <dt>{{ field.label }}</dt>
          <dd>{{ field.value }}</dd>
        </div>
      </dl>

      <footer class="record-details-actions">
        <slot name="actions">
          <BaseButton variant="secondary" @click="$emit('close')">Fechar</BaseButton>
        </slot>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.record-details-backdrop {
  z-index: 70;
}

.record-details-dialog {
  width: min(100%, 500px);
  padding: 25px;
}

.record-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.record-details-heading {
  min-width: 0;
}

.record-details-heading .eyebrow {
  margin-bottom: 7px;
}

.record-details-heading h2 {
  margin: 0;
  font-size: clamp(20px, 5vw, 25px);
  letter-spacing: -.035em;
  overflow-wrap: anywhere;
}

.record-details-close {
  flex: none;
  margin: -7px -7px 0 0;
}

.record-details-fields {
  display: grid;
  gap: 0;
  margin: 20px 0 0;
  border-top: 1px solid var(--border);
}

.record-details-field {
  display: grid;
  grid-template-columns: minmax(105px, .7fr) minmax(0, 1.3fr);
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.record-details-field dt {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.record-details-field dd {
  min-width: 0;
  margin: 0;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.record-details-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 20px;
}

@media (max-width: 700px) {
  .record-details-backdrop {
    align-items: end;
    padding: 12px 12px max(12px, env(safe-area-inset-bottom));
  }

  .record-details-dialog {
    width: 100%;
    max-height: min(82dvh, 720px);
    padding: 23px 19px max(19px, env(safe-area-inset-bottom));
    border-radius: 22px;
  }

  .record-details-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }

  .record-details-actions :deep(.btn) {
    width: 100%;
    min-height: 46px;
  }
}
</style>
