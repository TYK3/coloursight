import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correctImageData, correctRgb, simulateImageData, simulateRgb } from './correct.js';
import { deltaE2000 } from '../test/colour.js';

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function fixture() {
  // red, green, blue, yellow, grey, orange
  const px = [[220,40,40],[40,180,60],[40,60,220],[230,220,40],[128,128,128],[240,140,30]];
  const data = new Uint8ClampedArray(px.length * 4);
  px.forEach(([r,g,b], i) => data.set([r,g,b,200], i*4));
  return { width: px.length, height: 1, data };
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (i % 4 !== 3 && a[i] !== b[i]) n++; return n; };

test('seam A: normal leaves RGB unchanged and returns a copy', () => {
  const img = fixture();
  const out = correctImageData(img, { type: 'normal', confidence: 1 });
  assert.deepEqual([...out.data], [...img.data]);
  assert.notEqual(out.data, img.data);
});

for (const type of ['protan', 'deutan', 'tritan']) {
  test(`seam B: ${type} changes some pixels, keeps alpha and size`, () => {
    const img = fixture();
    const before = [...img.data];
    const out = correctImageData(img, { type });
    assert.ok(diff(out.data, img.data) > 0);
    assert.deepEqual([...img.data], before, 'input not mutated');
    assert.equal(out.width, img.width);
    for (let i = 3; i < out.data.length; i += 4) assert.equal(out.data[i], 200);
  });
}

test('seam B: grey is (near) unchanged for protan', () => {
  const [r,g,b] = correctRgb(128,128,128, { type: 'protan' });
  assert.ok(Math.abs(r-128) <= 2 && Math.abs(g-128) <= 2 && Math.abs(b-128) <= 2);
});

test('seam B: confidence 0 means no change', () => {
  const img = fixture();
  const out = correctImageData(img, { type: 'deutan', confidence: 0 });
  assert.equal(diff(out.data, img.data), 0);
});

test('seam C: missing/invalid profile treated as normal', () => {
  const img = fixture();
  for (const p of [undefined, null, {}, { type: 'xyz' }]) {
    assert.equal(diff(correctImageData(img, p).data, img.data), 0);
  }
});

test('simulateRgb: unknown/normal type leaves the colour unchanged', () => {
  for (const type of [undefined, null, 'normal', 'xyz']) {
    assert.deepEqual(simulateRgb(40, 180, 60, type), [40, 180, 60]);
  }
});

for (const type of ['protan', 'deutan', 'tritan']) {
  test(`simulateRgb: ${type} changes a colourful pixel`, () => {
    assert.notDeepEqual(simulateRgb(40, 180, 60, type), [40, 180, 60]);
  });
}

test('simulateImageData: changes some pixels, keeps alpha, size and does not mutate input', () => {
  const img = fixture();
  const before = [...img.data];
  const out = simulateImageData(img, 'tritan');
  assert.ok(diff(out.data, img.data) > 0);
  assert.deepEqual([...img.data], before, 'input not mutated');
  assert.equal(out.width, img.width);
  assert.equal(out.height, img.height);
  for (let i = 3; i < out.data.length; i += 4) assert.equal(out.data[i], 200);
});

test('simulateImageData: unknown type returns an unchanged copy', () => {
  const img = fixture();
  const out = simulateImageData(img, 'xyz');
  assert.deepEqual([...out.data], [...img.data]);
  assert.notEqual(out.data, img.data);
});

test('tritan correction separates the sample-scene blue/green pair under simulation', () => {
  const blue = hexToRgb('#1976d2');
  const green = hexToRgb('#2e7d32');
  const profile = { type: 'tritan', confidence: 1 };

  const before = deltaE2000(
    rgbToHex(simulateRgb(...blue, 'tritan')),
    rgbToHex(simulateRgb(...green, 'tritan')),
  );
  const after = deltaE2000(
    rgbToHex(simulateRgb(...correctRgb(...blue, profile), 'tritan')),
    rgbToHex(simulateRgb(...correctRgb(...green, profile), 'tritan')),
  );

  assert.ok(after > before * 2, `expected >2x separation, got ${before} -> ${after}`);
  assert.ok(after > 10, `expected clearly distinguishable (CIEDE2000 > 10), got ${after}`);
});

test('tritan correction leaves neutral greys roughly neutral', () => {
  for (const grey of [32, 64, 96, 128, 160, 192, 224]) {
    const [r, g, b] = correctRgb(grey, grey, grey, { type: 'tritan', confidence: 1 });
    assert.ok(Math.abs(r - grey) <= 2 && Math.abs(g - grey) <= 2 && Math.abs(b - grey) <= 2,
      `expected grey ${grey} to stay near-neutral, got [${r},${g},${b}]`);
  }
});
