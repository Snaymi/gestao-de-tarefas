import { ref } from 'vue';

const theme = ref<'light' | 'dark'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
let transitionTimer: number | undefined;
let transitionId = 0;

function readThemeTransitionDuration(root: HTMLElement): number {
  const value = getComputedStyle(root).getPropertyValue('--theme-transition-duration').trim();
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value);

  if (!match) return 2000;

  const duration = Number(match[1]);
  return match[2] === 's' ? duration * 1000 : duration;
}

export function useTheme() {

  function toggle() {
    const root = document.documentElement;
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark';

    if (transitionTimer !== undefined) {
      window.clearTimeout(transitionTimer);
      transitionTimer = undefined;
    }

    const currentTransitionId = ++transitionId;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let duration = 0;

    if (prefersReducedMotion) {
      delete root.dataset.themeTransition;
    } else {
      // Flush the active transition rules before changing the theme tokens.
      root.dataset.themeTransition = 'running';
      duration = readThemeTransitionDuration(root);
    }

    theme.value = nextTheme;
    root.dataset.theme = nextTheme;

    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // Keep the in-memory theme switch usable when browser storage is unavailable.
    } finally {
      if (!prefersReducedMotion) {
        transitionTimer = window.setTimeout(() => {
          if (currentTransitionId !== transitionId) return;

          delete root.dataset.themeTransition;
          transitionTimer = undefined;
        }, duration);
      }
    }
  }

  return { theme, toggle };
}
