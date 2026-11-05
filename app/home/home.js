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
 * Mount the home strip into `root` (the element with [data-el="home-strip"]).
 * @param {HTMLElement} root
 * @returns {{ destroy: () => void }}
 */
export function mountHomeStrip(root) {
  if (!root) return { destroy() {} };

  const before = root.querySelector('[data-el="home-strip-before"]');
  const after = root.querySelector('[data-el="home-strip-after"]');
  const caption = root.querySelector('[data-el="home-strip-caption"]');
  if (!(before instanceof HTMLCanvasElement) || !(after instanceof HTMLCanvasElement) || !caption) {
    return { destroy() {} };
  }

  const beforeCtx = before.getContext('2d', { willReadFrequently: true });
  const afterCtx = after.getContext('2d');
  if (!beforeCtx || !afterCtx) return { destroy() {} };

  function render() {
    const profile = getProfile();
    caption.textContent = captionForHome(profile);
    drawSampleScene(beforeCtx);
    const src = beforeCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
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
