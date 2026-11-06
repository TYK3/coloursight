/**
 * Home "Original vs corrected" strip.
 * Reuses the Preview module's sample scene and the correction engine so the
 * first screen shows real colour, not just text.
 * @module
 */

import { getProfile, subscribe } from '../profile/profile.js';
import { correctImageData } from '../correct/correct.js';
import { drawSampleScene, profileToCorrector } from '../preview/preview.js';

const SAMPLE_W = 320;
const SAMPLE_H = 240;

const TYPE_WORDS = { protan: 'protan', deutan: 'deutan', tritan: 'tritan' };

/** One truthful, concrete line per type naming the channels the correction separates. */
const EXPLAIN_BY_TYPE = {
  protan: 'Reds and greens that would blend together are pulled apart, so warning colours stay distinguishable.',
  deutan: 'Reds and greens that would blend together are pulled apart, so warning colours stay distinguishable.',
  tritan: 'Blues and greens that would blend together are pulled apart, so they stay distinguishable.',
};

/** Shown when there's no real profile yet, so the strip still has colour. */
export const HOME_FALLBACK_CORRECTOR = { type: 'deutan', confidence: 0.5 };

/**
 * Corrector input for the home strip: the active profile if it would apply
 * any remapping, otherwise a sensible "deutan, moderate" default.
 * @param {{ type?: string, severity?: number, confidence?: number }|null|undefined} profile
 * @returns {{ type: string, confidence: number }}
 */
export function correctorForHome(profile) {
  const mapped = profileToCorrector(profile);
  if (mapped.type === 'normal' || mapped.confidence === 0) {
    return { ...HOME_FALLBACK_CORRECTOR };
  }
  return mapped;
}

/**
 * Caption for the strip: names the active profile when there is one,
 * otherwise labels the fallback example clearly.
 * @param {{ type?: string, severity?: number, severityLabel?: string }|null|undefined} profile
 * @returns {string}
 */
export function captionForHome(profile) {
  const mapped = profileToCorrector(profile);
  if (mapped.type !== 'normal' && mapped.confidence > 0 && TYPE_WORDS[profile.type]) {
    const strength = profile.severityLabel && profile.severityLabel !== 'none'
      ? profile.severityLabel
      : 'mild';
    return `Your profile: ${TYPE_WORDS[profile.type]}, ${strength} — original vs corrected.`;
  }
  return 'Example profile: deutan, moderate — original vs corrected.';
}

/**
 * One concise, truthful line naming the channels the correction separates for
 * the type being demonstrated. The demo scene is always a sample, never the
 * viewer's own photo — see the "Example" chip in the markup.
 * @param {{ type?: string, severity?: number, confidence?: number }|null|undefined} profile
 * @returns {string}
 */
export function explainForHome(profile) {
  const { type } = correctorForHome(profile);
  return EXPLAIN_BY_TYPE[type] || EXPLAIN_BY_TYPE.deutan;
}

/**
 * Mount the home strip into `root` (the element with [data-el="home-strip"]).
 * @param {HTMLElement} root
 * @returns {{ destroy: () => void }}
 */
export function mountHomeStrip(root) {
  if (!root) return { destroy() {} };

  const before = root.querySelector('[data-el="home-strip-before"]');
  const after = root.querySelector('[data-el="home-strip-after"]');
  const caption = root.querySelector('[data-el="home-strip-caption"]');
  const explain = root.querySelector('[data-el="home-strip-explain"]');
  if (!(before instanceof HTMLCanvasElement) || !(after instanceof HTMLCanvasElement) || !caption) {
    return { destroy() {} };
  }

  // Render at up to 2x the logical sample size so the enlarged hero display
  // (CSS can show these well beyond 320x240) stays crisp. correctImageData is
  // per-pixel and size-independent, so this is safe without touching preview.js.
  const ratio = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  before.width = SAMPLE_W * ratio;
  before.height = SAMPLE_H * ratio;
  after.width = SAMPLE_W * ratio;
  after.height = SAMPLE_H * ratio;

  const beforeCtx = before.getContext('2d', { willReadFrequently: true });
  const afterCtx = after.getContext('2d');
  if (!beforeCtx || !afterCtx) return { destroy() {} };
  beforeCtx.setTransform(ratio, 0, 0, ratio, 0, 0);

  function render() {
    const profile = getProfile();
    caption.textContent = captionForHome(profile);
    if (explain) explain.textContent = explainForHome(profile);
    drawSampleScene(beforeCtx);
    const src = beforeCtx.getImageData(0, 0, before.width, before.height);
    const out = correctImageData(src, correctorForHome(profile));
    afterCtx.putImageData(out, 0, 0);
  }

  render();
  const unsubscribe = subscribe(render);

  return {
    destroy() {
      unsubscribe();
    },
  };
}

// Auto-mount when the home strip markup is present (shell wire-up).
const autoRoot = typeof document !== 'undefined' ? document.querySelector('[data-el="home-strip"]') : null;
if (autoRoot) mountHomeStrip(autoRoot);
