<script setup lang="ts">
import { useToast } from './composables/useToast';

const { toasts } = useToast();
</script>

<template>
  <RouterView />
  <div class="toast-stack" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.kind">{{ toast.message }}</div>
  </div>
</template>
