<script setup lang="ts">
import type { AuditAction } from '../../types';
import { auditActionLabels } from '../../utils/audit';

const props = defineProps<{ action: AuditAction }>();

const tone = (action: AuditAction) => {
  if (action === 'LOGIN_FAILED' || action === 'LOGIN_BLOCKED_INACTIVE' || action === 'USER_DEACTIVATED') return 'danger';
  if (action === 'TASK_COMPLETED' || action === 'USER_ACTIVATED' || action === 'LOGIN_SUCCEEDED') return 'success';
  if (action === 'TASK_DELETED') return 'warning';
  return 'neutral';
};
</script>

<template><span class="badge audit-badge" :class="`audit-${tone(props.action)}`">{{ auditActionLabels[props.action] }}</span></template>

<style scoped>
.audit-badge { white-space: normal; }
.audit-danger { background: var(--danger-soft); color: var(--danger); }
.audit-success { background: var(--success-soft); color: var(--success); }
.audit-warning { background: var(--warning-soft); color: var(--warning); }
.audit-neutral { background: var(--accent-soft); color: var(--accent); }
</style>
