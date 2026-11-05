/**
 * Pure helpers for the ColourSight settings form.
 * No DOM, no storage — map between ColourProfile and UI form state.
 * @module
 */

import { severityLabelFromSeverity } from '../profile/profile.js';

/** @typedef {import('../profile/profile.js').ColourProfile} ColourProfile */
/** @typedef {import('../profile/profile.js').ColourVisionType} ColourVisionType */
/** @typedef {import('../profile/profile.js').SeverityLabel} SeverityLabel */
/** @typedef {import('../profile/profile.js').ProfileSource} ProfileSource */

/**
 * @typedef {Object} SettingsFormState
 * @property {ColourVisionType} type
 * @property {number} intensityPercent 0..100 integer for the range control
 * @property {number} severity 0..1 (mapped from intensity)
 * @property {SeverityLabel} severityLabel
 * @property {ProfileSource} source
 * @property {string} updatedAt
 * @property {number} confidence
 */

/**
 * Map a 0–100 intensity slider value to profile severity (0..1).
 * @param {number} percent
 * @returns {number}
 */
export function sliderToSeverity(percent) {
  const n = typeof percent === 'number' && !Number.isNaN(percent) ? percent : 0;
  const clamped = Math.max(0, Math.min(100, n));
  return Math.round((clamped / 100) * 100) / 100;
}

/**
 * Map profile severity (0..1) to a 0–100 intensity slider value.
 * @param {number} severity
 * @returns {number}
 */
export function severityToSlider(severity) {
  const n = typeof severity === 'number' && !Number.isNaN(severity) ? severity : 0;
  const clamped = Math.max(0, Math.min(1, n));
  return Math.round(clamped * 100);
}

/**
 * Build UI form state from a ColourProfile.
 * @param {ColourProfile} profile
 * @returns {SettingsFormState}
 */
export function formStateFromProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new TypeError('formStateFromProfile requires a profile object');
  }
  const type = /** @type {ColourVisionType} */ (profile.type);
  const severity = type === 'normal' ? 0 : Number(profile.severity) || 0;
  const intensityPercent = severityToSlider(severity);
  return {
    type,
    intensityPercent,
    severity: sliderToSeverity(intensityPercent),
    severityLabel: severityLabelFromSeverity(severity),
    source: /** @type {ProfileSource} */ (profile.source),
    updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : '',
    confidence: typeof profile.confidence === 'number' ? profile.confidence : 0,
  };
}

/**
 * Build a partial profile payload for setProfile from form controls.
 * Always uses source `'manual'`.
 * @param {{ type: ColourVisionType, intensityPercent: number, confidence?: number }} form
 * @returns {{ type: ColourVisionType, severity: number, source: 'manual', confidence: number }}
 */
export function profilePayloadFromForm(form) {
  if (!form || typeof form !== 'object') {
    throw new TypeError('profilePayloadFromForm requires a form object');
  }
  const type = /** @type {ColourVisionType} */ (form.type);
  const severity = type === 'normal' ? 0 : sliderToSeverity(form.intensityPercent);
  const confidence =
    typeof form.confidence === 'number' && !Number.isNaN(form.confidence)
      ? form.confidence
      : 1;
  return {
    type,
    severity,
    source: /** @type {'manual'} */ ('manual'),
    confidence,
  };
}

/**
 * Human-readable source label (UK English).
 * @param {ProfileSource|string} source
 * @returns {string}
 */
export function sourceLabel(source) {
  switch (source) {
    case 'test':
      return 'colour-vision test';
    case 'manual':
      return 'manual settings';
    case 'default':
      return 'default (no test or saved profile yet)';
    default:
      return String(source);
  }
}

/**
 * Format an ISO timestamp for display in en-GB.
 * @param {string} iso
 * @returns {string}
 */
export function formatUpdatedAt(iso) {
  if (!iso || typeof iso !== 'string') return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Epoch sentinel used by DEFAULT_PROFILE
  if (d.getTime() === 0 || iso.startsWith('1970-01-01')) return 'never';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}
