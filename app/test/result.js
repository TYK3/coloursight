/**
 * Persist and load the last ColourSight screening result.
 * @module
 */

/**
 * @typedef {import('./scoring.js').ColourVisionResult} ColourVisionResult
 */

/** localStorage key consumed later by the camera correction flow. */
export const RESULT_STORAGE_KEY = 'coloursight.result';

/**
 * @param {ColourVisionResult} result
 */
export function saveResult(result) {
  localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
}

/**
 * @returns {ColourVisionResult|null}
 */
export function loadResult() {
  try {
    const raw = localStorage.getItem(RESULT_STORAGE_KEY);
    if (!raw) return null;
    return /** @type {ColourVisionResult} */ (JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * @returns {void}
 */
export function clearResult() {
  localStorage.removeItem(RESULT_STORAGE_KEY);
}
