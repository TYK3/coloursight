> **DRAFT – for Young to review and submit. Not submitted.**

# ColourSight

**Tagline:** A personal colour-vision screening plus live colour correction, running entirely in your browser.

## Inspiration
Colour-blind filters are usually one-size-fits-all. But two people with "red–green colour blindness" can see very differently. We wanted correction that first finds out how you see, then adapts to that, without sending anyone's camera or data to a server.

## What it does
- **Colour-vision screening:** 11 steps with coloured swatches and dotted plates that probe the protan, deutan and tritan axes, plus control items. You get a likely type, per-axis error rates and a confidence score. It is a screening only, not a diagnosis.
- **Personal profile:** the result is saved locally as a profile with type and severity.
- **Settings:** edit the type and correction intensity, or reset and clear your data.
- **Correction preview:** compare a sample scene or your own uploaded image before and after correction.
- **Live camera:** your webcam feed corrected in real time, with an Original/Corrected toggle.
- **Accessibility:** visible focus rings, 44px tap targets, focus moved to the heading on navigation, reduced-motion support, and prompts to take the test when no profile is saved.

## How we built it
Plain HTML, CSS and JavaScript modules with a small hash router. There is no backend and no build step. Correction is daltonisation in LMS colour space: we simulate the deficiency, then remap the error into channels the user can distinguish, with strength driven by the profile's severity. The camera pipeline draws webcam frames to a canvas and runs the filter on each frame. Profiles live in `localStorage`. Modules have Node unit tests (`node --test`).

## Challenges we ran into
- Making a short screen-based test give a useful signal despite uncalibrated displays. Control items and a confidence score help, and we're clear about the limits.
- Keeping per-pixel correction fast enough to run on live video in the browser.
- Getting keyboard focus right with a hash router (for example, making the skip link work).

## Accomplishments that we're proud of
- The whole flow, from test to profile to preview to live camera, works offline in the browser with nothing uploaded.
- Correction strength follows each person's profile instead of a fixed filter.
- We made accessibility a priority for an accessibility tool.

## What we learned
How cone-response (LMS) models underpin both simulating and correcting colour-vision deficiency, and how much honest wording matters for health-adjacent tools.

## What's next for ColourSight
- Test with people who have colour-vision deficiency and tune the test items and correction strength.
- Add more test items for better screening confidence.
- Improve performance on mobile, and support installing and using the app offline.

## Built with
HTML, CSS, JavaScript (ES modules), Canvas 2D, getUserMedia, localStorage, Node.js test runner, Playwright (screenshots)

*ColourSight is a screening and assistive tool. It does not diagnose or treat any condition.*
