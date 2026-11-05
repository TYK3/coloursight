import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROFILE,
  PROFILE_STORAGE_KEY,
  RESULT_STORAGE_KEY,
  SEVERITY_THRESHOLDS,
  clearProfile,
  getProfile,
  profileFromResult,
  sanitiseProfile,
  setProfile,
  severityLabelFromSeverity,
  subscribe,
} from './profile.js';

/** In-memory localStorage stand-in for node --test. */
function installMockStorage() {
  /** @type {Map<string, string>} */
  const data = new Map();
  const store = {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: store,
    configurable: true,
    writable: true,
  });
  return store;
}

beforeEach(() => {
  installMockStorage();
});

describe('severityLabelFromSeverity / thresholds', () => {
  it('maps bands at documented cut-offs', () => {
    assert.equal(severityLabelFromSeverity(0), 'none');
    assert.equal(severityLabelFromSeverity(SEVERITY_THRESHOLDS.mild - 0.01), 'none');
    assert.equal(severityLabelFromSeverity(SEVERITY_THRESHOLDS.mild), 'mild');
    assert.equal(severityLabelFromSeverity(0.44), 'mild');
    assert.equal(severityLabelFromSeverity(SEVERITY_THRESHOLDS.moderate), 'moderate');
    assert.equal(severityLabelFromSeverity(0.69), 'moderate');
    assert.equal(severityLabelFromSeverity(SEVERITY_THRESHOLDS.strong), 'strong');
    assert.equal(severityLabelFromSeverity(1), 'strong');
  });
});

describe('profileFromResult', () => {
  it('gives severity 0 and none for normal', () => {
    const profile = profileFromResult({
      type: 'normal',
      confidence: 0.95,
      scores: { protan: 0.1, deutan: 0.05, tritan: 0 },
      completedAt: '2026-11-05T12:00:00.000Z',
    });
    assert.equal(profile.type, 'normal');
    assert.equal(profile.severity, 0);
    assert.equal(profile.severityLabel, 'none');
    assert.equal(profile.confidence, 0.95);
    assert.equal(profile.source, 'test');
    assert.equal(profile.updatedAt, '2026-11-05T12:00:00.000Z');
    assert.equal(profile.version, 1);
  });

  it('scales axis error rate by confidence for protan', () => {
    // errorRate 0.8 * confidence 0.5 = 0.4 → mild (< 0.45)
    const mild = profileFromResult({
      type: 'protan',
      confidence: 0.5,
      scores: { protan: 0.8, deutan: 0.1, tritan: 0 },
      completedAt: '2026-11-05T12:00:00.000Z',
    });
    assert.equal(mild.type, 'protan');
    assert.equal(mild.severity, 0.4);
    assert.equal(mild.severityLabel, 'mild');

    // 1.0 * 0.9 = 0.9 → strong
    const strong = profileFromResult({
      type: 'deutan',
      confidence: 0.9,
      scores: { protan: 0.1, deutan: 1, tritan: 0.1 },
      completedAt: '2026-11-05T12:00:00.000Z',
    });
    assert.equal(strong.severity, 0.9);
    assert.equal(strong.severityLabel, 'strong');

    // 0.6 * 0.8 = 0.48 → moderate
    const moderate = profileFromResult({
      type: 'tritan',
      confidence: 0.8,
      scores: { protan: 0, deutan: 0, tritan: 0.6 },
      completedAt: '2026-11-05T12:00:00.000Z',
    });
    assert.equal(moderate.severity, 0.48);
    assert.equal(moderate.severityLabel, 'moderate');
  });

  it('clamps out-of-range scores and confidence', () => {
    const profile = profileFromResult({
      type: 'protan',
      confidence: 2,
      scores: { protan: 1.5, deutan: -1, tritan: 0 },
      completedAt: '2026-11-05T12:00:00.000Z',
    });
    assert.equal(profile.confidence, 1);
    assert.equal(profile.severity, 1);
    assert.equal(profile.severityLabel, 'strong');
  });
});

describe('setProfile / sanitiseProfile', () => {
  it('rejects unknown types', () => {
    assert.throws(() => setProfile({ type: 'octarine', severity: 0.5 }), /Unknown/);
    assert.throws(() => sanitiseProfile({ type: 'red-green' }), /Unknown/);
  });

  it('clamps numbers and forces severity 0 for normal', () => {
    const profile = setProfile({
      type: 'normal',
      severity: 0.9,
      confidence: 1.5,
      source: 'manual',
    });
    assert.equal(profile.severity, 0);
    assert.equal(profile.severityLabel, 'none');
    assert.equal(profile.confidence, 1);
    assert.equal(profile.source, 'manual');
    assert.equal(profile.version, 1);
  });

  it('persists and reloads via getProfile', () => {
    setProfile({
      type: 'deutan',
      severity: 0.55,
      confidence: 0.7,
      source: 'manual',
      updatedAt: '2026-11-05T13:00:00.000Z',
    });
    const loaded = getProfile();
    assert.equal(loaded.type, 'deutan');
    assert.equal(loaded.severity, 0.55);
    assert.equal(loaded.severityLabel, 'moderate');
    assert.equal(JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY)).type, 'deutan');
  });
});

describe('getProfile fallback from result', () => {
  it('derives from coloursight.result when no profile saved', () => {
    localStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify({
        type: 'protan',
        confidence: 0.8,
        scores: { protan: 0.75, deutan: 0.1, tritan: 0 },
        completedAt: '2026-11-05T14:00:00.000Z',
        answers: [],
        controlCorrect: 2,
        controlTotal: 2,
      }),
    );
    const profile = getProfile();
    assert.equal(profile.type, 'protan');
    assert.equal(profile.severity, 0.6); // 0.75 * 0.8
    assert.equal(profile.severityLabel, 'moderate');
    assert.equal(profile.source, 'test');
    assert.equal(localStorage.getItem(PROFILE_STORAGE_KEY), null);
  });

  it('returns DEFAULT_PROFILE when nothing is stored', () => {
    const profile = getProfile();
    assert.deepEqual(profile, { ...DEFAULT_PROFILE });
    assert.equal(profile.source, 'default');
  });
});

describe('clearProfile and subscribe', () => {
  it('clearProfile removes the key and notifies', () => {
    setProfile({ type: 'tritan', severity: 0.8, confidence: 0.9, source: 'manual' });
    /** @type {import('./profile.js').ColourProfile[]} */
    const seen = [];
    const unsub = subscribe((p) => seen.push(p));
    clearProfile();
    assert.equal(localStorage.getItem(PROFILE_STORAGE_KEY), null);
    assert.ok(seen.length >= 1);
    assert.equal(seen.at(-1).source, 'default');
    unsub();
  });

  it('subscribe fires on setProfile', () => {
    /** @type {string[]} */
    const types = [];
    const unsub = subscribe((p) => types.push(p.type));
    setProfile({ type: 'protan', severity: 0.3, confidence: 0.6, source: 'manual' });
    assert.deepEqual(types, ['protan']);
    unsub();
    setProfile({ type: 'deutan', severity: 0.3, confidence: 0.6, source: 'manual' });
    assert.deepEqual(types, ['protan']);
  });
});
