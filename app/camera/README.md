# Camera capture

Live webcam → canvas pipeline for ColourSight (no colour correction yet).

## Smoke test

From the repo root (HTTPS or localhost required for `getUserMedia`):

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/app/camera/ in Chrome or Firefox desktop. Press **Start camera**, allow permission, confirm frames on the canvas, then **Stop**.

## Module

```js
import { createCamera, describeCameraError } from './camera.js';
```

`createCamera({ canvas, video?, onState?, onError? })` returns `{ start, stop, isRunning, getCanvas }`.
