/**
 * Persist and load the last ColourSight screening result.
 * @module
 */

import { profileFromResult, setProfile } from '../profile/profile.js';

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
 * Finish the test: store the result and make the derived profile active
 * through the profile module, so Preview, Settings and the camera refresh.
 * @param {ColourVisionResult} result
 * @returns {import('../profile/profile.js').ColourProfile}
 */
export function commitResult(result) {
  saveResult(result);
  return setProfile(profileFromResult(result));
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
