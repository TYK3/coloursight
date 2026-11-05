import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileToCorrector, TRITAN_DEMO_DOTS } from './preview.js';
import { simulateRgb } from '../correct/correct.js';

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function dist(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

test('sample-scene pair: blue/green dots are distinct normally but collapse under tritan simulation', () => {
  const [[blueHex], [greenHex]] = TRITAN_DEMO_DOTS;
  const blue = hexToRgb(blueHex);
  const green = hexToRgb(greenHex);
  const normalDist = dist(blue, green);
  const tritanDist = dist(simulateRgb(...blue, 'tritan'), simulateRgb(...green, 'tritan'));
  assert.ok(normalDist > 100, `expected the pair to read as clearly different normally, got ${normalDist}`);
  assert.ok(tritanDist < 30, `expected the pair to collapse under tritan simulation, got ${tritanDist}`);
});

test('sample-scene pair: still distinguishable under protan/deutan simulation', () => {
  const [[blueHex], [greenHex]] = TRITAN_DEMO_DOTS;
  const blue = hexToRgb(blueHex);
  const green = hexToRgb(greenHex);
  for (const type of ['protan', 'deutan']) {
    const d = dist(simulateRgb(...blue, type), simulateRgb(...green, type));
    assert.ok(d > 100, `expected the pair to stay distinguishable under ${type}, got ${d}`);
  }
});

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

import { refreshOnPreviewRoute } from './preview.js';

function fakeWindow(hash) {
  const target = new EventTarget();
  target.location = { hash };
  return target;
}

test('preview re-reads the profile each time its route is shown', () => {
  const win = fakeWindow('#test');
  let refreshes = 0;
  const off = refreshOnPreviewRoute(win, () => {
    refreshes += 1;
  });
  win.dispatchEvent(new Event('hashchange'));
  assert.equal(refreshes, 0, 'not shown yet');
  win.location.hash = '#preview';
  win.dispatchEvent(new Event('hashchange'));
  assert.equal(refreshes, 1);
  win.location.hash = '#settings';
  win.dispatchEvent(new Event('hashchange'));
  win.location.hash = '#preview';
  win.dispatchEvent(new Event('hashchange'));
  assert.equal(refreshes, 2);
  off();
  win.dispatchEvent(new Event('hashchange'));
  assert.equal(refreshes, 2, 'unbinds cleanly');
});
