import { ref } from 'vue';
const theme = ref<'light' | 'dark'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
export function useTheme() {
  function toggle() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme.value; localStorage.setItem('theme', theme.value); }
  return { theme, toggle };
}
