import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correctImageData, correctRgb } from './correct.js';

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
