<script setup lang="ts">
import { ClipboardList } from '@lucide/vue';
import type { Task } from '../../types';
import TaskCard from '../molecules/TaskCard.vue';
import BaseSkeleton from '../atoms/BaseSkeleton.vue';
defineProps<{ tasks: Task[]; loading?: boolean; busyId?: string }>();
defineEmits<{ edit: [task: Task]; complete: [task: Task]; remove: [task: Task] }>();
</script>
<template><div class="panel"><template v-if="loading"><div v-for="n in 4" :key="n" class="skeleton-row"><BaseSkeleton width="45%" height="19px"/><BaseSkeleton width="65%" height="13px"/></div></template><div v-else-if="!tasks.length" class="empty"><ClipboardList :size="35"/><h3>Nenhuma tarefa encontrada</h3><p>Crie uma nova tarefa ou ajuste os filtros.</p></div><TaskCard v-for="task in tasks" v-else :key="task.id" :task="task" :busy="busyId === task.id" @edit="$emit('edit', $event)" @complete="$emit('complete', $event)" @remove="$emit('remove', $event)"/></div></template>
<style scoped>.skeleton-row{padding:24px;border-bottom:1px solid var(--border);display:grid;gap:12px}.skeleton-row:last-child{border:0}</style>
