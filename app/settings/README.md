# Settings — profile type and intensity

UI for reading and updating the personalised ColourSight profile (`coloursight.profile`) via the profile module.

## Standalone smoke test

From the repo root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/app/settings/ — change type and intensity, press **Save profile**, reload, confirm the values persist.

## Shell hook (one line each)

When wiring into `app/index.html`, add:

```html
<link rel="stylesheet" href="settings/settings.css">
<script type="module" src="settings/settings.js"></script>
```

Optionally place an empty `<div id="settings-root"></div>` inside `#view-settings`. The module self-mounts into `#settings-root` if present, otherwise into `#view-settings`.

## Module

```js
import { mountSettings } from './settings.js';
mountSettings(document.getElementById('settings-root'));
```

Pure helpers live in `state.js` (`sliderToSeverity`, `severityToSlider`, `formStateFromProfile`, `profilePayloadFromForm`).

## Tests

```bash
node --test app/settings/settings.test.mjs
```
