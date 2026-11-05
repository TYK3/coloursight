# app/preview — static image correction preview

Before/after stills remapped with the saved ColourProfile via `correctImageData`.
Assistive colour remapping only, not a medical treatment.

## API

```js
import { mountPreview, profileToCorrector } from './preview.js';
mountPreview(document.getElementById('preview-root'));
```

- Reads the active profile with `getProfile()` / `subscribe()` from `app/profile/`.
- Maps profile → corrector with `profileToCorrector` so **severity** drives remapping strength (`normal` → strength 0).
- Profile persistence key: `coloursight.profile` (localStorage).

## Smoke test

From the repo root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/app/preview/ — load the sample scene (or upload an image), compare Before/After, press Apply. Change the profile in another tab (or via DevTools `localStorage`) and the preview re-applies on subscribe.

Shell nav mount (allowed minimal wire-up in `app/index.html` only): http://localhost:8000/app/#preview

## Test

```bash
node --test app/preview/preview.test.mjs
```
