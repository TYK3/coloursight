import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { commitResult, loadResult, RESULT_STORAGE_KEY } from './result.js';
import { getProfile, setProfile, subscribe, PROFILE_STORAGE_KEY } from '../profile/profile.js';

function installMockStorage() {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(String(k), String(v)),
      removeItem: (k) => data.delete(k),
      clear: () => data.clear(),
    },
    configurable: true,
    writable: true,
  });
}

const protanResult = {
  type: 'protan',
  confidence: 0.9,
  scores: { protan: 1, deutan: 0, tritan: 0 },
  answers: [],
  completedAt: '2026-11-05T15:00:00.000Z',
  controlCorrect: 2,
  controlTotal: 2,
};

describe('commitResult (finishing the test)', () => {
  beforeEach(installMockStorage);

  it('stores the result and makes it the active profile', () => {
    commitResult(protanResult);
    assert.equal(loadResult().type, 'protan');
    assert.equal(RESULT_STORAGE_KEY, 'coloursight.result');
    assert.equal(PROFILE_STORAGE_KEY, 'coloursight.profile');
    const stored = JSON.parse(localStorage.getItem('coloursight.profile'));
    assert.equal(stored.type, 'protan');
    assert.equal(stored.source, 'test');
    const active = getProfile();
    assert.equal(active.type, 'protan');
    assert.equal(active.severity, 0.9);
    assert.equal(active.severityLabel, 'strong');
  });

  it('replaces an older saved profile instead of leaving it stale', () => {
    setProfile({ type: 'tritan', severity: 0.3, confidence: 1, source: 'manual' });
    commitResult(protanResult);
    assert.equal(getProfile().type, 'protan');
    assert.equal(getProfile().source, 'test');
  });

  it('notifies profile subscribers so mounted views refresh', () => {
    const seen = [];
    const off = subscribe((p) => seen.push(p.type));
    commitResult(protanResult);
    off();
    assert.deepEqual(seen, ['protan']);
  });
});
