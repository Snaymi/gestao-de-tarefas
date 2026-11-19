<script setup lang="ts">
import { ClipboardList } from '@lucide/vue';
import type { AuditLog } from '../../types';
import AuditLogEntry from '../molecules/AuditLogEntry.vue';
import BaseSkeleton from '../atoms/BaseSkeleton.vue';

defineProps<{ entries: AuditLog[]; loading?: boolean }>();
</script>

<template>
  <div class="audit-list" :aria-busy="loading">
    <template v-if="loading">
      <article v-for="item in 5" :key="item" class="panel audit-skeleton">
        <BaseSkeleton width="190px" height="20px" />
        <BaseSkeleton width="min(360px, 80%)" height="14px" />
        <BaseSkeleton width="min(260px, 65%)" height="14px" />
      </article>
    </template>
    <div v-else-if="!entries.length" class="panel empty audit-empty">
      <ClipboardList :size="35" />
      <h2>Nenhuma atividade encontrada</h2>
      <p>Quando houver atividades correspondentes aos filtros, elas aparecerão aqui.</p>
    </div>
    <template v-else>
      <AuditLogEntry v-for="entry in entries" :key="entry.id" :entry="entry" />
    </template>
  </div>
</template>

<style scoped>
.audit-list { display: grid; gap: 10px; }
.audit-skeleton { display: grid; gap: 12px; padding: 20px; }
.audit-empty { border: 1px solid var(--border); border-radius: var(--radius); }
.audit-empty h2 { color: var(--text); font-size: 17px; margin: 4px 0 8px; }
.audit-empty p { font-size: 13px; margin-bottom: 0; }
</style>
