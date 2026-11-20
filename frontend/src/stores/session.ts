import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, ApiError } from '../services/api';
import type { User } from '../types';

type SessionStatus = 'unknown' | 'checking' | 'authenticated' | 'anonymous' | 'unavailable';

export const useSession = defineStore('session', () => {
  const user = ref<User | null>(null);
  const status = ref<SessionStatus>('unknown');
  let pendingRestore: Promise<void> | undefined;

  function restore() {
    if (pendingRestore) return pendingRestore;

    status.value = 'checking';
    const attempt = api.me().then(
      restoredUser => {
        if (pendingRestore !== attempt) return;
        user.value = restoredUser;
        status.value = 'authenticated';
      },
      (error: unknown) => {
        if (pendingRestore !== attempt) return;
        user.value = null;
        status.value = error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable';
      }
    ).finally(() => {
      if (pendingRestore === attempt) pendingRestore = undefined;
    });

    pendingRestore = attempt;
    return attempt;
  }

  function setSession(nextUser: User | null) {
    pendingRestore = undefined;
    user.value = nextUser;
    status.value = nextUser ? 'authenticated' : 'anonymous';
  }

  async function login(email: string, password: string) {
    setSession(await api.login(email, password));
  }

  async function logout() {
    await api.logout();
    setSession(null);
  }

  return { user, status, restore, login, logout };
});
