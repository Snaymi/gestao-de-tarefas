import { ref } from 'vue';
type Toast = { id: number; message: string; kind: 'success' | 'error' };
const toasts = ref<Toast[]>([]);
let id = 0;
export function useToast() {
  function show(message: string, kind: Toast['kind'] = 'success') { const next = ++id; toasts.value.push({ id: next, message, kind }); setTimeout(() => { toasts.value = toasts.value.filter(item => item.id !== next); }, 4000); }
  return { toasts, show };
}
