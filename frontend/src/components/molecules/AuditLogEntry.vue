<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AuditLog } from '../../types';
import AuditActionBadge from '../atoms/AuditActionBadge.vue';
import RecordDetailsDialog from './RecordDetailsDialog.vue';
import { auditActionLabels } from '../../utils/audit';

const props = defineProps<{ entry: AuditLog }>();
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' });
const timestamp = computed(() => new Date(props.entry.createdAt));
const detailsOpen = ref(false);

const fieldLabels: Record<string, string> = {
  title: 'Título', description: 'Descrição', owner: 'Responsável', name: 'Nome',
  role: 'Perfil', active: 'Status', email: 'E-mail', status: 'Situação',
  completedAt: 'Concluída em', reason: 'Motivo', attemptedEmail: 'E-mail informado'
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'vazio';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string') {
    if (value === 'ADMIN') return 'Administrador';
    if (value === 'USER') return 'Usuário';
    if (value === 'PENDING') return 'Pendente';
    if (value === 'COMPLETED') return 'Concluída';
    if (value === 'ACCOUNT_INACTIVE') return 'Conta inativa';
    return value;
  }
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.name === 'string') return object.name;
    return JSON.stringify(value);
  }
  return String(value);
}

function displayFieldValue(key: string, value: unknown): string {
  if (key === 'active' && typeof value === 'boolean') return value ? 'Ativa' : 'Inativa';
  return displayValue(value);
}

function formattedDetails(details: Record<string, unknown> | null): string[] {
  if (!details) return [];

  const changes = details.changes;
  if (changes && typeof changes === 'object' && !Array.isArray(changes)) {
    return Object.entries(changes as Record<string, unknown>).map(([key, value]) => {
      const change = value as { before?: unknown; after?: unknown };
      return `${fieldLabels[key] ?? key}: ${displayFieldValue(key, change.before)} → ${displayFieldValue(key, change.after)}`;
    });
  }

  return Object.entries(details)
    .filter(([key]) => key !== 'attemptedEmail')
    .map(([key, value]) => `${fieldLabels[key] ?? key}: ${displayFieldValue(key, value)}`);
}

const detailLines = computed(() => formattedDetails(props.entry.details));
const detailFields = computed(() => [
  { label: 'Ação', value: auditActionLabels[props.entry.action] },
  {
    label: 'Responsável',
    value: [props.entry.actorName, props.entry.actorRole === 'ADMIN' ? 'Administrador' : props.entry.actorRole === 'USER' ? 'Usuário' : '', props.entry.actorEmail ?? '']
      .filter(Boolean)
      .join(' · ')
  },
  ...(props.entry.entityLabel ? [{
    label: props.entry.entityType === 'AUTH' ? 'Conta relacionada' : props.entry.entityType === 'TASK' ? 'Tarefa' : 'Usuário relacionado',
    value: props.entry.entityLabel
  }] : []),
  { label: 'Data', value: dateFormatter.format(timestamp.value) },
  { label: 'Horário', value: timeFormatter.format(timestamp.value) },
  ...(detailLines.value.length ? [{ label: 'Alterações', value: detailLines.value.join(' · ') }] : [])
]);
</script>

<template>
  <article class="audit-entry audit-entry-desktop panel">
    <div class="entry-main">
      <div class="entry-heading">
        <AuditActionBadge :action="entry.action" />
        <h2>{{ entry.summary }}</h2>
      </div>
      <dl class="entry-meta">
        <div>
          <dt>Responsável pela atividade</dt>
          <dd>{{ entry.actorName }}<span v-if="entry.actorRole"> · {{ entry.actorRole === 'ADMIN' ? 'Administrador' : 'Usuário' }}</span><span v-if="entry.actorEmail"> · {{ entry.actorEmail }}</span></dd>
        </div>
        <div v-if="entry.entityLabel">
          <dt>{{ entry.entityType === 'AUTH' ? 'Conta relacionada' : entry.entityType === 'TASK' ? 'Tarefa' : 'Usuário relacionado' }}</dt>
          <dd>{{ entry.entityLabel }}</dd>
        </div>
      </dl>
      <ul v-if="detailLines.length" class="entry-details" aria-label="Detalhes da atividade">
        <li v-for="line in detailLines" :key="line">{{ line }}</li>
      </ul>
    </div>
    <time class="entry-time" :datetime="entry.createdAt">
      <span>{{ dateFormatter.format(timestamp) }}</span>
      <strong>{{ timeFormatter.format(timestamp) }}</strong>
    </time>
  </article>

  <button
    class="audit-entry-mobile panel"
    type="button"
    :aria-label="`Ver detalhes da atividade: ${entry.summary}`"
    aria-haspopup="dialog"
    @click="detailsOpen = true"
  >
    <span class="mobile-audit-heading">
      <AuditActionBadge :action="entry.action" />
      <strong>{{ entry.summary }}</strong>
    </span>
    <span class="mobile-audit-meta">
      <span>{{ entry.actorName }}</span>
      <time :datetime="entry.createdAt">{{ dateFormatter.format(timestamp) }} · {{ timeFormatter.format(timestamp) }}</time>
    </span>
    <span class="mobile-audit-hint">Toque para ver detalhes</span>
  </button>

  <RecordDetailsDialog
    v-if="detailsOpen"
    :title="entry.summary"
    subtitle="Detalhes da atividade"
    :fields="detailFields"
    @close="detailsOpen = false"
  />
</template>

<style scoped>
.audit-entry { padding: 18px 20px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.audit-entry-mobile { display: none; }
.entry-main { min-width: 0; flex: 1; }
.entry-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.entry-heading h2 { font-size: 15px; line-height: 1.45; margin: 0; font-weight: 650; overflow-wrap: anywhere; }
.entry-meta { display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 14px 0 0; }
.entry-meta dt { color: var(--text-muted); font-size: 10px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; margin-bottom: 4px; }
.entry-meta dd { color: var(--text); font-size: 12px; margin: 0; overflow-wrap: anywhere; }
.entry-meta dd span { color: var(--text-muted); }
.entry-details { display: grid; gap: 4px; border-left: 2px solid var(--border); list-style: none; margin: 13px 0 0; padding: 2px 0 2px 11px; }
.entry-details li { color: var(--text-muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.entry-time { display: grid; gap: 4px; flex: none; text-align: right; color: var(--text-muted); font-size: 12px; white-space: nowrap; }
.entry-time strong { color: var(--text); font-size: 13px; font-weight: 650; }
@media (max-width: 700px) {
  .audit-entry-desktop { display: none; }
  .audit-entry-mobile {
    width: 100%;
    display: grid;
    gap: 10px;
    padding: 15px;
    color: var(--text);
    text-align: left;
  }
  .mobile-audit-heading { display: grid; justify-items: start; gap: 8px; min-width: 0; }
  .mobile-audit-heading strong { font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
  .mobile-audit-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; color: var(--text-muted); font-size: 11px; overflow-wrap: anywhere; }
  .mobile-audit-meta time { font-variant-numeric: tabular-nums; }
  .mobile-audit-hint { color: var(--accent); font-size: 11px; font-weight: 700; }
}
</style>
