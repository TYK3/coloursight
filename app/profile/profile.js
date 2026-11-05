/**
 * Personalised colour-vision deficiency profile.
 * Consumed by camera correction and settings; derived from the screening test.
 * @module
 */

/**
 * @typedef {'protan'|'deutan'|'tritan'|'normal'} ColourVisionType
 * @typedef {'none'|'mild'|'moderate'|'strong'} SeverityLabel
 * @typedef {'test'|'manual'|'default'} ProfileSource
 *
 * @typedef {Object} ColourProfile
 * @property {ColourVisionType} type
 * @property {number} severity 0..1, clamped, rounded to 2 dp
 * @property {SeverityLabel} severityLabel
 * @property {number} confidence 0..1
 * @property {ProfileSource} source
 * @property {string} updatedAt ISO-8601 timestamp
 * @property {1} version Schema version
 *
 * @typedef {Object} ColourVisionResult
 * @property {ColourVisionType} type
 * @property {number} confidence
 * @property {{ protan: number, deutan: number, tritan: number }} scores
 * @property {string} [completedAt]
 */

/** localStorage key for the durable profile. */
export const PROFILE_STORAGE_KEY = 'coloursight.profile';

/** localStorage key written by the screening test (read-only here). */
export const RESULT_STORAGE_KEY = 'coloursight.result';

/** @type {ReadonlySet<ColourVisionType>} */
const VALID_TYPES = new Set(['protan', 'deutan', 'tritan', 'normal']);

/** @type {ReadonlySet<ProfileSource>} */
const VALID_SOURCES = new Set(['test', 'manual', 'default']);

/** Severity label thresholds (see MAPPING.md). */
export const SEVERITY_THRESHOLDS = Object.freeze({
  mild: 0.2,
  moderate: 0.45,
  strong: 0.7,
});

/**
 * Fallback when nothing is saved and no test result exists.
 * @type {Readonly<ColourProfile>}
 */
export const DEFAULT_PROFILE = Object.freeze({
  type: 'normal',
  severity: 0,
  severityLabel: /** @type {SeverityLabel} */ ('none'),
  confidence: 0,
  source: /** @type {ProfileSource} */ ('default'),
  updatedAt: '1970-01-01T00:00:00.000Z',
  version: /** @type {1} */ (1),
});

/** @type {Set<(profile: ColourProfile) => void>} */
const listeners = new Set();

let storageListenerBound = false;

/**
 * @param {number} n
 * @returns {number}
 */
function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Map numeric severity to a plain-language band.
 * @param {number} severity
 * @returns {SeverityLabel}
 */
export function severityLabelFromSeverity(severity) {
  const s = clamp01(severity);
  if (s < SEVERITY_THRESHOLDS.mild) return 'none';
  if (s < SEVERITY_THRESHOLDS.moderate) return 'mild';
  if (s < SEVERITY_THRESHOLDS.strong) return 'moderate';
  return 'strong';
}

/**
 * Pure mapping from a screening result to a profile (see MAPPING.md).
 * @param {ColourVisionResult} result
 * @returns {ColourProfile}
 */
export function profileFromResult(result) {
  if (!result || typeof result !== 'object') {
    throw new TypeError('profileFromResult requires a ColourVisionResult');
  }
  const type = VALID_TYPES.has(/** @type {ColourVisionType} */ (result.type))
    ? /** @type {ColourVisionType} */ (result.type)
    : 'normal';
  const confidence = round2(clamp01(result.confidence));

  let severity = 0;
  if (type !== 'normal') {
    const scores = result.scores && typeof result.scores === 'object' ? result.scores : {};
    const errorRate = clamp01(/** @type {Record<string, number>} */ (scores)[type]);
    severity = round2(clamp01(errorRate * confidence));
  }

  const updatedAt =
    typeof result.completedAt === 'string' && result.completedAt
      ? result.completedAt
      : new Date().toISOString();

  return {
    type,
    severity,
    severityLabel: severityLabelFromSeverity(severity),
    confidence,
    source: 'test',
    updatedAt,
    version: 1,
  };
}

/**
 * Sanitise / validate a partial or full profile for storage.
 * Rejects unknown types; clamps numbers; derives severityLabel.
 * @param {Partial<ColourProfile> & { type?: string }} input
 * @returns {ColourProfile}
 */
export function sanitiseProfile(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('setProfile requires a profile object');
  }
  if (!VALID_TYPES.has(/** @type {ColourVisionType} */ (input.type))) {
    throw new TypeError(`Unknown colour-vision type: ${String(input.type)}`);
  }

  const type = /** @type {ColourVisionType} */ (input.type);
  let severity = round2(clamp01(input.severity));
  if (type === 'normal') severity = 0;

  const confidence = round2(clamp01(input.confidence));
  const source = VALID_SOURCES.has(/** @type {ProfileSource} */ (input.source))
    ? /** @type {ProfileSource} */ (input.source)
    : 'manual';

  const updatedAt =
    typeof input.updatedAt === 'string' && input.updatedAt
      ? input.updatedAt
      : new Date().toISOString();

  return {
    type,
    severity,
    severityLabel: severityLabelFromSeverity(severity),
    confidence,
    source,
    updatedAt,
    version: 1,
  };
}

/** @returns {Storage|null} */
function storage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @returns {unknown|null}
 */
function readJson(key) {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @returns {ColourProfile}
 */
function loadStoredProfile() {
  const raw = readJson(PROFILE_STORAGE_KEY);
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('no stored profile');
  }
  return sanitiseProfile(/** @type {Partial<ColourProfile>} */ (raw));
}

/**
 * Current profile: saved profile, else derived from the last test result, else default.
 * @returns {ColourProfile}
 */
export function getProfile() {
  try {
    return loadStoredProfile();
  } catch {
    // fall through
  }

  const result = readJson(RESULT_STORAGE_KEY);
  if (result && typeof result === 'object' && 'type' in /** @type {object} */ (result)) {
    try {
      return profileFromResult(/** @type {ColourVisionResult} */ (result));
    } catch {
      // fall through
    }
  }

  return { ...DEFAULT_PROFILE };
}

/**
 * Persist a profile (validated). Notifies subscribers.
 * @param {Partial<ColourProfile> & { type: ColourVisionType }} input
 * @returns {ColourProfile}
 */
export function setProfile(input) {
  const profile = sanitiseProfile(input);
  const store = storage();
  if (store) {
    store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
  notify(profile);
  return profile;
}

/**
 * Remove the saved profile. Subscribers receive the next getProfile() value
 * (may still derive from a stored test result).
 * @returns {void}
 */
export function clearProfile() {
  const store = storage();
  if (store) {
    store.removeItem(PROFILE_STORAGE_KEY);
  }
  notify(getProfile());
}

/**
 * Subscribe to profile changes (same-tab writes and cross-tab storage events).
 * @param {(profile: ColourProfile) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('subscribe requires a function');
  }
  listeners.add(fn);
  ensureStorageListener();
  return () => {
    listeners.delete(fn);
  };
}

/**
 * @param {ColourProfile} profile
 */
function notify(profile) {
  for (const fn of [...listeners]) {
    try {
      fn(profile);
    } catch {
      // subscriber errors must not break the module
    }
  }
}

function ensureStorageListener() {
  if (storageListenerBound) return;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return;
  }
  storageListenerBound = true;
  window.addEventListener('storage', (event) => {
    if (event.key !== PROFILE_STORAGE_KEY && event.key !== null) return;
    notify(getProfile());
  });
}
