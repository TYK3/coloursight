import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileToCorrector } from './mapping.js';

test('normal maps to zero strength', () => {
  assert.deepEqual(
    profileToCorrector({ type: 'normal', severity: 0.9, confidence: 0.8 }),
    { type: 'normal', confidence: 0 },
  );
});

test('severity drives corrector confidence when present', () => {
  assert.deepEqual(
    profileToCorrector({ type: 'deutan', severity: 0.65, confidence: 0.9 }),
    { type: 'deutan', confidence: 0.65 },
  );
});

test('falls back to profile.confidence when severity missing', () => {
  assert.deepEqual(
    profileToCorrector({ type: 'protan', confidence: 0.4 }),
    { type: 'protan', confidence: 0.4 },
  );
});

test('nullish / empty profile treated as normal', () => {
  assert.deepEqual(profileToCorrector(null), { type: 'normal', confidence: 0 });
  assert.deepEqual(profileToCorrector(undefined), { type: 'normal', confidence: 0 });
  assert.deepEqual(profileToCorrector({}), { type: 'normal', confidence: 0 });
});
