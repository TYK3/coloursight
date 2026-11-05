import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlate, digitMask, plateSvg, PLATE_SIZE, PLATE_RADIUS } from './plate.js';
import { relativeLuminance } from './colour.js';

const FIG = '#b57c54';
const GND = '#8e8b59';
const plate = (seed, digit = '5') => generatePlate({ digit, figure: FIG, ground: GND, seed });

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const sd = (xs) => Math.sqrt(mean(xs.map((v) => (v - mean(xs)) ** 2)));

describe('plate generation', () => {
  it('is deterministic for a seed and differs between seeds', () => {
    assert.deepEqual(plate(11), plate(11));
    assert.notDeepEqual(plate(11).dots, plate(12).dots);
    assert.equal(plateSvg({ digit: '2', figure: FIG, ground: GND }, 5), plateSvg({ digit: '2', figure: FIG, ground: GND }, 5));
  });

  it('fills the disc with non-overlapping dots', () => {
    const { dots } = plate(3);
    assert.ok(dots.length > 200, `only ${dots.length} dots`);
    const c = PLATE_SIZE / 2;
    for (const d of dots) {
      assert.ok(Math.hypot(d.x - c, d.y - c) + d.r <= PLATE_RADIUS + 1e-6);
    }
    for (let i = 0; i < dots.length; i += 1) {
      for (let j = i + 1; j < dots.length; j += 1) {
        const a = dots[i];
        const b = dots[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r - 1e-6, 'dots overlap');
      }
    }
  });

  it('colours dots by the digit mask: figure inside, ground outside', () => {
    const inside = digitMask('5');
    const { dots } = plate(4);
    for (const d of dots) assert.equal(d.figure, inside(d.x, d.y));
    const fig = dots.filter((d) => d.figure).length;
    assert.ok(fig > 25 && fig < dots.length - 100, `figure dots: ${fig}`);
  });

  for (const digit of ['2', '5', '6']) {
    it(`digit ${digit}: dot size and packing don't reveal the shape`, () => {
      const inside = digitMask(digit);
      const figR = [];
      const gndR = [];
      let figCover = 0;
      let figArea = 0;
      let gndCover = 0;
      let gndArea = 0;
      for (const seed of [1, 2, 3]) {
        const { dots } = plate(seed, digit);
        dots.forEach((d) => (d.figure ? figR : gndR).push(d.r));
        // Area coverage on a sampling grid, inside vs outside the mask.
        const c = PLATE_SIZE / 2;
        for (let y = 0; y < PLATE_SIZE; y += 2) {
          for (let x = 0; x < PLATE_SIZE; x += 2) {
            if (Math.hypot(x - c, y - c) > PLATE_RADIUS - 8) continue;
            const covered = dots.some((d) => (d.x - x) ** 2 + (d.y - y) ** 2 <= d.r * d.r);
            if (inside(x, y)) {
              figArea += 1;
              if (covered) figCover += 1;
            } else {
              gndArea += 1;
              if (covered) gndCover += 1;
            }
          }
        }
      }
      assert.ok(Math.abs(mean(figR) - mean(gndR)) < 0.5, `mean r ${mean(figR)} vs ${mean(gndR)}`);
      assert.ok(Math.abs(sd(figR) - sd(gndR)) < 0.5, 'radius spread');
      const fc = figCover / figArea;
      const gc = gndCover / gndArea;
      assert.ok(Math.abs(fc - gc) < 0.05, `coverage ${fc.toFixed(3)} vs ${gc.toFixed(3)}`);
    });
  }

  it('adds per-dot lightness noise without a brightness cue between figure and ground', () => {
    const { dots } = plate(9);
    const y = (d) => relativeLuminance(d.fill);
    const fig = dots.filter((d) => d.figure).map(y);
    const gnd = dots.filter((d) => !d.figure).map(y);
    assert.ok(sd(fig) / mean(fig) > 0.03, 'figure dots need lightness noise');
    assert.ok(sd(gnd) / mean(gnd) > 0.03, 'ground dots need lightness noise');
    assert.ok(Math.abs(mean(fig) - mean(gnd)) / mean(gnd) < 0.03, 'mean luminance must match');
  });

  it('renders an accessible SVG with one circle per dot', () => {
    const svg = plateSvg({ digit: '6', figure: FIG, ground: GND }, 2);
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-label="[^"]+"/);
    assert.doesNotMatch(svg, />6</, 'the digit itself must not be in the markup');
    const n = (svg.match(/<circle /g) || []).length;
    assert.equal(n, generatePlate({ digit: '6', figure: FIG, ground: GND, seed: 2 }).dots.length + 1);
  });
});
