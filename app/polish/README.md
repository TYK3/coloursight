# Polish — UX and accessibility pass (T10)

Shell-level polish for ColourSight. Nothing in the feature folders is edited.

- `polish.css` — loaded **last** in `index.html`. Visible `:focus-visible` rings with a white halo, 44px tap targets (nav, buttons, settings radio rows, range), wrapping nav and single-column layout under 30rem, media scaling (`max-width: 100%`, `height: auto`), readable minimum font sizes, empty-state notice styles, reduced-motion overrides.
- `polish.js` — loaded **last**. Moves focus to the view's `h1` on route change; makes the skip link focus the current heading instead of changing the hash (the hash router would otherwise treat `#main` as an unknown route and show Home); sets a title per route; shows a helpful notice with a "Take the colour-vision test" link on Preview, Settings and Camera when no profile or test result is stored (via `getProfile()` from `app/profile/profile.js`), updating on route change, profile change and `storage` events.
- `empty-state.js` — pure helpers (`needsTestPrompt`, `emptyStateFor`, `titleFor`).

## Shell hook

```html
<link rel="stylesheet" href="polish/polish.css">   <!-- last stylesheet -->
<script type="module" src="polish/polish.js"></script> <!-- last module -->
```

## Tests

```bash
node --test app/polish/a11y.test.mjs
```
