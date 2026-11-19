import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue', () => ({
  ref: (value: unknown) => ({ value }),
}));

type ThemeRoot = { dataset: Record<string, string> };

let root: ThemeRoot;
let storage: Map<string, string>;
let reducedMotion: boolean;

beforeEach(() => {
  vi.useFakeTimers();
  root = { dataset: { theme: 'light' } };
  storage = new Map();
  reducedMotion = false;

  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', { documentElement: root });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  });
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
  })));
  vi.stubGlobal('getComputedStyle', vi.fn(() => ({
    getPropertyValue: (name: string) => name === '--theme-transition-duration' ? '2000ms' : '',
  })));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loadThemeController() {
  vi.resetModules();
  return import('./useTheme');
}

async function runInitialThemeScript(
  getItem: (key: string) => string | null,
  systemPrefersDark: boolean,
): Promise<ThemeRoot> {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error('Theme bootstrap script was not found in index.html');

  const bootRoot: ThemeRoot = { dataset: {} };
  runInNewContext(script, {
    document: { documentElement: bootRoot },
    matchMedia: () => ({ matches: systemPrefersDark }),
    localStorage: { getItem },
  });

  return bootRoot;
}

describe('theme transition controller', () => {
  it.each([
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const)('%s → %s updates state, persistence, and clears its marker', async (initial, next) => {
    root.dataset.theme = initial;
    const { useTheme } = await loadThemeController();
    const { theme, toggle } = useTheme();

    toggle();

    expect(theme.value).toBe(next);
    expect(root.dataset.theme).toBe(next);
    expect(root.dataset.themeTransition).toBe('running');
    expect(storage.get('theme')).toBe(next);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1999);
    expect(root.dataset.themeTransition).toBe('running');
    vi.advanceTimersByTime(1);

    expect(root.dataset.themeTransition).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips the long transition under reduced motion but still switches and persists', async () => {
    reducedMotion = true;
    const { useTheme } = await loadThemeController();
    const { theme, toggle } = useTheme();

    toggle();

    expect(theme.value).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.themeTransition).toBeUndefined();
    expect(storage.get('theme')).toBe('dark');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels an earlier timer on rapid toggles and ignores its stale callback', async () => {
    const { useTheme } = await loadThemeController();
    const { theme, toggle } = useTheme();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    toggle();
    const staleCallback = setTimeoutSpy.mock.calls[0]?.[0];
    toggle();

    expect(theme.value).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(storage.get('theme')).toBe('light');
    expect(vi.getTimerCount()).toBe(1);
    expect(root.dataset.themeTransition).toBe('running');

    if (typeof staleCallback === 'function') staleCallback();
    expect(root.dataset.themeTransition).toBe('running');

    vi.advanceTimersByTime(2000);
    expect(root.dataset.themeTransition).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops an active transition if reduced motion becomes enabled', async () => {
    const { useTheme } = await loadThemeController();
    const { toggle } = useTheme();

    toggle();
    expect(vi.getTimerCount()).toBe(1);
    reducedMotion = true;
    toggle();

    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.themeTransition).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the theme switch usable when storage writes fail', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => { throw new Error('Storage unavailable'); }),
    });
    const { useTheme } = await loadThemeController();
    const { theme, toggle } = useTheme();

    expect(toggle).not.toThrow();
    expect(theme.value).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.themeTransition).toBe('running');
  });
});

describe('initial theme and transition timing', () => {
  it.each([
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    [null, true, 'dark'],
    ['invalid', true, 'dark'],
  ] as const)('initializes from saved/system preference (%s)', async (saved, prefersDark, expected) => {
    const bootRoot = await runInitialThemeScript(() => saved, prefersDark);

    expect(bootRoot.dataset.theme).toBe(expected);
    expect(bootRoot.dataset.themeTransition).toBeUndefined();
  });

  it('restores the saved theme after a simulated page reload without an interactive transition', async () => {
    const { useTheme } = await loadThemeController();
    useTheme().toggle();
    vi.advanceTimersByTime(2000);

    const bootRoot = await runInitialThemeScript(key => storage.get(key) ?? null, false);

    expect(bootRoot.dataset.theme).toBe('dark');
    expect(bootRoot.dataset.themeTransition).toBeUndefined();
  });

  it('falls back to the system preference when localStorage cannot be read', async () => {
    const bootRoot = await runInitialThemeScript(() => { throw new Error('Storage unavailable'); }, true);

    expect(bootRoot.dataset.theme).toBe('dark');
    expect(bootRoot.dataset.themeTransition).toBeUndefined();
  });

  it('keeps component and background timing coordinated at two seconds', async () => {
    const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
    const duration = (name: string) => Number(css.match(new RegExp(`${name}:\\s*(\\d+)ms`))?.[1]);
    const componentDuration = duration('--theme-component-transition-duration');
    const backgroundDelay = duration('--theme-background-transition-delay');
    const backgroundDuration = duration('--theme-background-transition-duration');

    expect(duration('--theme-transition-duration')).toBe(2000);
    expect(componentDuration).toBe(1450);
    expect(backgroundDelay).toBe(850);
    expect(backgroundDuration).toBe(1150);
    expect(backgroundDelay + backgroundDuration).toBe(2000);
    expect(css).toMatch(/--bg var\(--theme-background-transition-duration\).*?var\(--theme-background-transition-delay\)/);
    expect(css).toMatch(/--surface var\(--theme-component-transition-duration\)/);
    expect(css).not.toMatch(/transition:\s*all\b/i);
  });

  it('applies reduced motion globally without a sidebar exception', async () => {
    const globals = await readFile(new URL('../styles/globals.css', import.meta.url), 'utf8');
    const sidebar = await readFile(new URL('../components/organisms/AppSidebar.vue', import.meta.url), 'utf8');

    expect(globals).toMatch(/transition-delay:\s*0ms\s*!important/);
    expect(globals).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(sidebar).not.toContain('prefers-reduced-motion');
  });
});
