# Theme transition notes

## Timing and accessibility

- Theme token changes start when the user switches the theme.
- Component color tokens finish after 1,450 ms.
- The page canvas (`--bg`) starts after 850 ms and finishes at 2,000 ms.
- `useTheme` keeps the transition marker for the configured 2,000 ms, clears an earlier timer on a rapid second toggle, and guards against stale timer callbacks.
- With `prefers-reduced-motion: reduce`, the theme and storage still update, but the long transition marker is skipped. The global reduced-motion rule reduces CSS motion to 0.01 ms, runs animations once, and clears delays, including on the mobile sidebar and its scrim.
- The initial theme is restored before rendering from a valid saved value, or from the system preference. If storage is unavailable, the system preference is used and an in-memory theme change remains usable.

The transition is limited to registered semantic color tokens and the shadow color. It does not use `transition: all`, a frame loop, or layout properties. Opening/closing dialogs and expiring toasts keep their own existing behavior while theme tokens update.

## Audited color exceptions

- `#151525` was previously a fixed dark label color on the primary button. It has been removed; the label uses `--surface` so its foreground follows the active theme.
- `#d7d1ff` is the pale violet emphasis in the login headline. It is now the semantic `--brand-highlight` token and intentionally remains constant in both themes as part of the brand palette.
- The login brand panel uses `--login-brand-surface`, which interpolates between the existing light purple and dark purple values. White logo/copy, its translucent decorative rings, and the pale-violet headline remain fixed brand treatments over that panel.
- The modal backdrop (`rgba(9, 12, 24, 0.58)`) and mobile navigation scrim (`rgba(8, 11, 25, 0.5)`) are intentionally fixed neutral overlays. Their opacity is constant; the visible composite follows the surface underneath.

## Native controls

- Text inputs, textareas, and selects use `.input` with theme surface, text, and border tokens. Option colors are also set from theme tokens where the browser honors author styling.
- Autofilled inputs use the same surface/text tokens and retain the focus ring.
- There are no checkbox or radio controls in the current frontend. Disabled states currently apply to buttons only; their semantic colors remain intact beneath the existing disabled opacity.
- `color-scheme` changes immediately because browser-drawn parts are not reliably interpolated. Native select popups/options, scrollbars, and browser-managed autofill details may therefore switch discretely; they remain native and usable. This is a documented platform limitation rather than a color token being left out of the transition.

## Verification status

Run `npm test` for the Vitest unit coverage. It uses controlled timers for the theme controller and checks the CSS timing configuration; it does not claim to prove the browser's rendered interpolation. The production build and diff whitespace check pass. Login was previewed in both final themes. The current browser session honors reduced motion, so it does not provide a visual capture of the 1,450–2,000 ms interpolation. Full-motion timing, authenticated routes, and the multi-resolution captures still need the browser homologation pass on a profile set to `no-preference`.
