<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from './composables/useToast';
import AppSidebar from './components/organisms/AppSidebar.vue';
import AppHeader from './components/organisms/AppHeader.vue';
const route = useRoute(); const menuOpen = ref(false); const { toasts } = useToast();
</script>
<template><div v-if="route.path === '/login' || !['/', '/tarefas', '/usuarios'].includes(route.path)"><RouterView/></div><div v-else class="app-shell"><AppSidebar :open="menuOpen" @close="menuOpen = false"/><div class="main-area"><AppHeader @menu="menuOpen = true"/><main class="content"><RouterView/></main></div></div><div class="toast-stack" aria-live="polite"><div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.kind">{{ toast.message }}</div></div></template>
