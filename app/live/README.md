# Live camera correction (T8)

Shows the webcam feed with colour correction applied in real time, using the saved profile.

- `live.js` — `mountLive(root)`: Start/Stop camera, Original / Corrected toggle, profile summary, error area, disclaimer.
- `mapping.js` — `profileToCorrector(profile)`: severity (else confidence) drives strength; `normal` means no correction.
- `live.css` — styles scoped to `.cs-live`.

How it works: `createCamera` paints the webcam onto an offscreen source canvas. A separate frame loop reads that canvas, runs `correctImageData` in Corrected mode (or copies it as-is in Original mode), and paints the visible canvas. Profile changes arrive through `subscribe` and take effect on the next frame.

## Smoke test

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/app/live/` (localhost or HTTPS is required for camera access), click **Start camera**, allow permission, and switch between Original and Corrected.

## Unit tests

```sh
node --test app/live/live.test.mjs
```
