import { onBeforeUnmount, onMounted, ref } from 'vue';

export function useDialogFocus() {
  const dialog = ref<HTMLElement | null>(null);
  let previous: HTMLElement | null = null;
  onMounted(() => {
    previous = document.activeElement as HTMLElement | null;
    dialog.value?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
  });
  onBeforeUnmount(() => previous?.focus());
  function trap(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !dialog.value) return;
    const items = [...dialog.value.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return { dialog, trap };
}
