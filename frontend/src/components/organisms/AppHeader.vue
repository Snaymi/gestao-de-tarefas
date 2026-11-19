<script setup lang="ts">
import { LogOut, Menu } from '@lucide/vue';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { useSession } from '../../stores/session';
import { useToast } from '../../composables/useToast';
import ThemeSwitcher from '../molecules/ThemeSwitcher.vue';
defineEmits<{ menu: [] }>();
const route = useRoute(); const router = useRouter(); const session = useSession(); const { show } = useToast();
const name = computed(() => ({ '/': 'Visão geral', '/tarefas': 'Tarefas', '/usuarios': 'Usuários' })[route.path] || 'Página');
async function logout() { try { await session.logout(); router.push('/login'); } catch { show('Não foi possível encerrar a sessão.', 'error'); } }
</script>
<template><header class="header"><div class="header-left"><button class="btn btn-ghost icon-btn mobile-only" aria-label="Abrir menu" @click="$emit('menu')"><Menu :size="22"/></button><span class="breadcrumb">Workspace <span>/</span> <strong>{{ name }}</strong></span></div><div class="header-right"><ThemeSwitcher/><span class="header-divider"></span><span class="header-avatar" :title="session.user?.name">{{ session.user?.name?.slice(0,1).toUpperCase() }}</span><button class="btn btn-ghost icon-btn" aria-label="Sair" title="Sair" @click="logout"><LogOut :size="18"/></button></div></header></template>
<style scoped>.header{height:76px;padding:0 42px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}.header-left,.header-right{display:flex;align-items:center;gap:12px}.breadcrumb{color:var(--text-muted);font-size:13px}.breadcrumb span{padding:0 7px;color:var(--disabled)}.breadcrumb strong{color:var(--text);font-weight:650}.header-divider{height:26px;width:1px;background:var(--border)}.header-avatar{width:34px;height:34px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:800;font-size:13px}@media(max-width:900px){.header{padding:0 22px;height:68px}}@media(max-width:600px){.header{padding:0 15px}.breadcrumb{font-size:12px}.breadcrumb span{padding:0 3px}.header-right{gap:3px}}</style>
