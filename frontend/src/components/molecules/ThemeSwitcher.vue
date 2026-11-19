<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { useTheme } from '../../composables/useTheme';
const { theme, toggle } = useTheme();
</script>
<template><button class="btn btn-ghost icon-btn" :aria-label="theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'" :title="theme === 'dark' ? 'Tema claro' : 'Tema escuro'" @click="toggle"><Sun v-if="theme === 'dark'" :size="19"/><Moon v-else :size="19"/></button></template>
