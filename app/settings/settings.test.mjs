import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formStateFromProfile,
  formatUpdatedAt,
  profilePayloadFromForm,
  severityToSlider,
  sliderToSeverity,
  sourceLabel,
} from './state.js';
import {
  DEFAULT_PROFILE,
  PROFILE_STORAGE_KEY,
  RESULT_STORAGE_KEY,
  clearProfile,
  getProfile,
  setProfile,
} from '../profile/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

describe('sliderToSeverity / severityToSlider', () => {
  it('maps 0–100 percent to 0..1 severity and back', () => {
    assert.equal(sliderToSeverity(0), 0);
    assert.equal(sliderToSeverity(50), 0.5);
    assert.equal(sliderToSeverity(100), 1);
    assert.equal(sliderToSeverity(33), 0.33);
    assert.equal(severityToSlider(0), 0);
    assert.equal(severityToSlider(0.5), 50);
    assert.equal(severityToSlider(1), 100);
    assert.equal(severityToSlider(0.33), 33);
  });

  it('clamps out-of-range and tolerates bad input', () => {
    assert.equal(sliderToSeverity(-10), 0);
    assert.equal(sliderToSeverity(150), 1);
    assert.equal(sliderToSeverity(Number.NaN), 0);
    assert.equal(severityToSlider(-0.5), 0);
    assert.equal(severityToSlider(2), 100);
    assert.equal(severityToSlider(Number.NaN), 0);
  });
});

describe('formStateFromProfile', () => {
  it('builds form state including intensity percent and labels', () => {
    const state = formStateFromProfile({
      type: 'deutan',
      severity: 0.7,
      severityLabel: 'strong',
      confidence: 0.9,
      source: 'test',
      updatedAt: '2026-11-05T12:00:00.000Z',
      version: 1,
    });
    assert.equal(state.type, 'deutan');
    assert.equal(state.intensityPercent, 70);
    assert.equal(state.severity, 0.7);
    assert.equal(state.severityLabel, 'strong');
    assert.equal(state.source, 'test');
    assert.equal(state.updatedAt, '2026-11-05T12:00:00.000Z');
  });

  it('forces intensity 0 when type is normal', () => {
    const state = formStateFromProfile({
      ...DEFAULT_PROFILE,
      type: 'normal',
      severity: 0.8,
    });
    assert.equal(state.intensityPercent, 0);
    assert.equal(state.severity, 0);
    assert.equal(state.severityLabel, 'none');
  });
});

describe('profilePayloadFromForm', () => {
  it('writes source manual and maps intensity to severity', () => {
    const payload = profilePayloadFromForm({
      type: 'protan',
      intensityPercent: 45,
      confidence: 0.8,
    });
    assert.equal(payload.type, 'protan');
    assert.equal(payload.severity, 0.45);
    assert.equal(payload.source, 'manual');
    assert.equal(payload.confidence, 0.8);
  });

  it('zeros severity for normal / off', () => {
    const payload = profilePayloadFromForm({
      type: 'normal',
      intensityPercent: 80,
    });
    assert.equal(payload.severity, 0);
    assert.equal(payload.source, 'manual');
  });
});

describe('sourceLabel / formatUpdatedAt', () => {
  it('labels known sources in UK English', () => {
    assert.match(sourceLabel('test'), /test/i);
    assert.match(sourceLabel('manual'), /manual/i);
    assert.match(sourceLabel('default'), /default/i);
  });

  it('formats timestamps and treats epoch as never', () => {
    assert.equal(formatUpdatedAt('1970-01-01T00:00:00.000Z'), 'never');
    assert.equal(formatUpdatedAt(''), 'unknown');
    const formatted = formatUpdatedAt('2026-11-05T14:30:00.000Z');
    assert.notEqual(formatted, 'never');
    assert.notEqual(formatted, 'unknown');
  });
});

describe('profile persistence via settings helpers', () => {
  it('survives reload: set, re-read getProfile', () => {
    const payload = profilePayloadFromForm({
      type: 'tritan',
      intensityPercent: 60,
      confidence: 1,
    });
    const saved = setProfile(payload);
    assert.equal(saved.source, 'manual');
    assert.equal(saved.type, 'tritan');
    assert.equal(saved.severity, 0.6);

    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    assert.ok(raw);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.type, 'tritan');
    assert.equal(parsed.severity, 0.6);
    assert.equal(parsed.source, 'manual');

    // Simulate reload: clear in-memory listeners by reading fresh from storage
    const again = getProfile();
    assert.equal(again.type, 'tritan');
    assert.equal(again.severity, 0.6);
    assert.equal(again.source, 'manual');
    assert.equal(again.severityLabel, 'moderate');
  });

  it('reload-persistence with dynamic re-import of profile module', async () => {
    setProfile(
      profilePayloadFromForm({
        type: 'deutan',
        intensityPercent: 25,
        confidence: 1,
      }),
    );

    const storeSnapshot = localStorage.getItem(PROFILE_STORAGE_KEY);
    assert.ok(storeSnapshot);

    // Fresh module evaluation still sees the same mock localStorage
    const url = pathToFileURL(path.join(__dirname, '../profile/profile.js')).href;
    const fresh = await import(`${url}?reload=${Date.now()}`);
    const reloaded = fresh.getProfile();
    assert.equal(reloaded.type, 'deutan');
    assert.equal(reloaded.severity, 0.25);
    assert.equal(reloaded.source, 'manual');
  });

  it('clearProfile falls back to test result when present', () => {
    localStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify({
        type: 'protan',
        confidence: 0.8,
        scores: { protan: 0.9, deutan: 0.1, tritan: 0 },
        completedAt: '2026-11-05T10:00:00.000Z',
      }),
    );
    setProfile(
      profilePayloadFromForm({
        type: 'tritan',
        intensityPercent: 100,
        confidence: 1,
      }),
    );
    assert.equal(getProfile().source, 'manual');

    clearProfile();
    const after = getProfile();
    assert.equal(after.source, 'test');
    assert.equal(after.type, 'protan');
  });

  it('clear everything removes profile and result', () => {
    setProfile(
      profilePayloadFromForm({
        type: 'deutan',
        intensityPercent: 40,
      }),
    );
    localStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify({
        type: 'deutan',
        confidence: 0.7,
        scores: { protan: 0, deutan: 0.8, tritan: 0 },
        completedAt: '2026-11-05T10:00:00.000Z',
      }),
    );

    localStorage.removeItem(RESULT_STORAGE_KEY);
    clearProfile();

    assert.equal(localStorage.getItem(PROFILE_STORAGE_KEY), null);
    assert.equal(localStorage.getItem(RESULT_STORAGE_KEY), null);
    const after = getProfile();
    assert.equal(after.source, 'default');
    assert.equal(after.type, 'normal');
  });
});

