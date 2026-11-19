<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean; type?: 'button' | 'submit'; disabled?: boolean }>(), { variant: 'primary', type: 'button' });
</script>
<template><button :type="type" class="btn" :class="`btn-${variant}`" :disabled="disabled || loading"><span v-if="loading" class="spinner" aria-hidden="true"></span><slot /></button></template>
<style scoped>.spinner{width:15px;height:15px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .65s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style>
