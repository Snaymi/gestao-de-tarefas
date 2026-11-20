<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '../components/atoms/BaseButton.vue';
import BrandLogo from '../components/atoms/BrandLogo.vue';
import AppHeader from '../components/organisms/AppHeader.vue';
import AppSidebar from '../components/organisms/AppSidebar.vue';
import { useSession } from '../stores/session';

const route = useRoute();
const router = useRouter();
const session = useSession();
const menuOpen = ref(false);
const canOpenRoute = computed(() => !!session.user && (!route.meta.admin || session.user.role === 'ADMIN'));

watch([() => session.status, canOpenRoute], ([status, allowed]) => {
  if (status === 'unknown') void session.restore();
  if (status === 'anonymous') void router.replace('/login');
  if (status === 'authenticated' && !allowed) void router.replace('/');
}, { immediate: true });
</script>

<template>
  <div v-if="canOpenRoute" class="app-shell">
    <AppSidebar :open="menuOpen" @close="menuOpen = false" />
    <div class="main-area">
      <AppHeader @menu="menuOpen = true" />
      <main class="content"><RouterView /></main>
    </div>
  </div>
  <main v-else class="session-gate">
    <div class="panel panel-pad session-panel">
      <BrandLogo />
      <template v-if="session.status === 'unavailable'">
        <p role="alert">Não foi possível verificar sua sessão.</p>
        <BaseButton @click="session.restore()">Tentar novamente</BaseButton>
      </template>
      <p v-else role="status" class="muted">Verificando sua sessão…</p>
    </div>
  </main>
</template>

<style scoped>
.session-gate {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
}
.session-panel {
  display: grid;
  justify-items: center;
  gap: 16px;
  width: min(100%, 360px);
  text-align: center;
}
.session-panel p {
  margin: 0;
}
</style>
