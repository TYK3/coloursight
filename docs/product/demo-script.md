# ColourSight demo script (about 2:30)

Setup: serve `app/` on localhost (`npx serve app`, or `python3 -m http.server 8000` from `app/`) in Chrome. Clear `localStorage` first. Have a webcam and some colourful objects (fruit, cables, a chart) in reach. Camera access needs localhost or HTTPS.

| Time | On screen | Spoken |
| --- | --- | --- |
| 0:00–0:15 | Home page | "About 1 in 12 men and 1 in 200 women have some form of colour-vision deficiency. Generic colour-blind filters treat everyone the same. ColourSight adjusts its correction to how *you* see." |
| 0:15–0:25 | Point at the three steps and the footer | "It's a static web app. Everything runs in your browser, so nothing is uploaded." |
| 0:25–1:00 | Click **Start the colour test** and answer a few steps | "First, an 11-step screening with coloured swatches and dotted plates. It checks protan, deutan and tritan axes, and includes control items to catch guessing or a badly calibrated screen." |
| 1:00–1:15 | Result screen | "This gives a likely type and a confidence score. To be clear, it's a screening, not a diagnosis. We tell people to see an optometrist for that." |
| 1:15–1:35 | **Settings**: change intensity, Save | "You can fine-tune the type and correction intensity yourself, or reset and clear everything." |
| 1:35–1:55 | **Preview** → Load sample scene → Apply correction | "Here's a before-and-after on a still image. We use LMS-space daltonisation. We simulate your deficiency, then shift the lost colour difference into channels you can see. Your severity sets how strong the shift is." |
| 1:55–2:20 | **Camera** → open live correction, Start camera, toggle Original/Corrected on real objects | "And this is the live camera. Every frame is corrected in real time, on your device. Switch between Original and Corrected to see what changes." |
| 2:20–2:30 | Back to Home | "ColourSight: a personal screening, then correction that fits you. All in the browser, and nothing leaves your device. Thanks!" |

Notes: the prevalence figure in the first line is a commonly cited estimate and doesn't come from the app. Drop it if we can't cite a source. If the camera fails on the day, fall back to the Preview with an uploaded photo.
