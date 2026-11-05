# app/correct — colour correction filter

Daltonization (LMS-space CVD simulation + error remapping) driven by a ColourVisionResult profile.
Assistive colour remapping only, not a medical treatment.

## API
```js
import { correctImageData, correctRgb } from './correct.js';
const out = correctImageData(ctx.getImageData(0, 0, w, h), { type: 'deutan', confidence: 0.8 });
```
- `profile.type`: `protan | deutan | tritan | normal`; missing/unknown → treated as `normal` (unchanged copy).
- `profile.confidence` (0..1, optional, default 1) scales correction strength.
- Input is never mutated; returns a new ImageData (or `{width,height,data}` outside the browser). No DOM needed.

## Test
`node --test app/correct/correct.test.mjs`

## Smoke test demo
From repo root: `python3 -m http.server 8000`, open http://localhost:8000/app/correct/ — pick a profile, Apply, compare Before/After.
