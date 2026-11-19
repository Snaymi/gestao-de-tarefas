<script setup lang="ts">defineProps<{ status: 'PENDING' | 'COMPLETED' }>();</script>
<template><span class="badge" :class="status === 'COMPLETED' ? 'badge-completed' : 'badge-pending'"><span class="dot"></span>{{ status === 'COMPLETED' ? 'Concluída' : 'Pendente' }}</span></template>
<style scoped>.dot{width:6px;height:6px;border-radius:50%;background:currentColor}</style>
