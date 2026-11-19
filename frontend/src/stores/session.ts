import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, ApiError } from '../services/api';
import type { User } from '../types';
export const useSession = defineStore('session', () => {
  const user = ref<User | null>(null);
  const ready = ref(false);
  async function restore() { try { user.value = await api.me(); } catch (error) { if (!(error instanceof ApiError) || error.status !== 401) console.error(error); user.value = null; } finally { ready.value = true; } }
  async function login(email: string, password: string) { user.value = await api.login(email, password); }
  async function logout() { await api.logout(); user.value = null; }
  return { user, ready, restore, login, logout };
});
