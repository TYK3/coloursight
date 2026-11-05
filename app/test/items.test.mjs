import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, buildItems, scoreableItems, SWATCH_JITTER } from './items.js';
import {
  COPUNCTAL,
  deltaE2000,
  deltaE2000Lab,
  hexToXyY,
  relativeLuminance,
  simulateDichromat,
} from './colour.js';
import { scoreAnswers } from './scoring.js';

const AXES = ['protan', 'deutan', 'tritan'];
const targeted = (items) => items.filter((it) => AXES.includes(it.axis));

/** Angle (deg, 0..90) between the pair's chromaticity line and the line to the copunctal point. */
function offLineDegrees(hexA, hexB, axis) {
  const a = hexToXyY(hexA);
  const b = hexToXyY(hexB);
  const cp = COPUNCTAL[axis];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const u = Math.atan2(b.y - a.y, b.x - a.x);
  const v = Math.atan2(mid.y - cp.y, mid.x - cp.x);
  let d = Math.abs(((u - v) * 180) / Math.PI) % 180;
  if (d > 90) d = 180 - d;
  return d;
}

describe('colour maths', () => {
  it('CIEDE2000 matches the Sharma et al. (2005) reference pair 1', () => {
    const d = deltaE2000Lab([50, 2.6772, -79.7751], [50, 0, -82.7485]);
    assert.ok(Math.abs(d - 2.0425) < 1e-3, `got ${d}`);
  });

  it('relative luminance of sRGB white, black and mid-grey', () => {
    assert.ok(Math.abs(relativeLuminance('#ffffff') - 1) < 1e-4);
    assert.equal(relativeLuminance('#000000'), 0);
    assert.ok(Math.abs(relativeLuminance('#777777') - 0.1845) < 1e-3);
  });

  it('a naive blue/yellow pair is NOT a tritan confusion pair', () => {
    // The old bank used blue vs yellow for tritan; a tritan simulation keeps them far apart.
    assert.ok(deltaE2000(simulateDichromat('#4a7ab8', 'tritan'), simulateDichromat('#c8b040', 'tritan')) > 20);
  });
});

describe('confusion-line swatch pairs', () => {
  const items = targeted(buildItems(1));

  it('every targeted item has a base pair and keeps the answer id', () => {
    assert.equal(items.length, 9);
    for (const it of items) {
      assert.equal(it.pair.length, 2, it.id);
      if (it.kind === 'odd-out') {
        assert.ok(it.options.some((o) => o.id === it.correct), it.id);
      }
    }
  });

  for (const axis of AXES) {
    it(`${axis} pairs lie on ${axis} confusion lines through the copunctal point`, () => {
      for (const it of items.filter((i) => i.axis === axis)) {
        const off = offLineDegrees(it.pair[0], it.pair[1], axis);
        assert.ok(off < 1.5, `${it.id} is ${off.toFixed(2)}° off the ${axis} line`);
        // and clearly not on the other two axes' lines
        for (const other of AXES.filter((a) => a !== axis)) {
          assert.ok(offLineDegrees(it.pair[0], it.pair[1], other) > 5, `${it.id} vs ${other}`);
        }
      }
    });
  }

  it('pair members have matched relative luminance (within 2%)', () => {
    for (const it of items) {
      const [ya, yb] = it.pair.map(relativeLuminance);
      assert.ok(Math.abs(ya - yb) / ((ya + yb) / 2) < 0.02, `${it.id}: ${ya} vs ${yb}`);
    }
  });

  it('pairs are clearly different for normal colour vision (CIEDE2000 >= 12)', () => {
    for (const it of items) {
      const d = deltaE2000(it.pair[0], it.pair[1]);
      assert.ok(d >= 12, `${it.id}: ΔE00 ${d.toFixed(1)}`);
    }
  });

  it('pairs nearly collapse for the targeted dichromacy (simulated ΔE00 <= 4)', () => {
    for (const it of items) {
      const [a, b] = it.pair.map((h) => simulateDichromat(h, it.axis));
      const d = deltaE2000(a, b);
      assert.ok(d <= 4, `${it.id}: simulated ΔE00 ${d.toFixed(2)}`);
    }
  });
});

describe('lightness jitter', () => {
  it('each swatch is jittered in luminance within the documented range', () => {
    for (const it of targeted(buildItems(7)).filter((i) => i.kind === 'odd-out')) {
      const baseY = relativeLuminance(it.pair[0]);
      const ys = it.options.map((o) => relativeLuminance(o.colour));
      for (const y of ys) {
        assert.ok(Math.abs(y / baseY - 1) <= SWATCH_JITTER + 0.02, `${it.id}`);
      }
      assert.ok(new Set(it.options.map((o) => o.colour)).size > 2, `${it.id} has no jitter`);
    }
  });

  it('brightness does not give the odd swatch away', () => {
    let lightest = 0;
    let darkest = 0;
    let total = 0;
    for (let seed = 1; seed <= 150; seed += 1) {
      for (const it of targeted(buildItems(seed)).filter((i) => i.kind === 'odd-out')) {
        const ys = it.options.map((o) => relativeLuminance(o.colour));
        const odd = it.options.findIndex((o) => o.id === it.correct);
        if (ys[odd] === Math.max(...ys)) lightest += 1;
        if (ys[odd] === Math.min(...ys)) darkest += 1;
        total += 1;
      }
    }
    // Chance level is 25% each; brightness alone must not find the odd one out.
    assert.ok(lightest / total < 0.35, `odd was lightest ${lightest}/${total}`);
    assert.ok(darkest / total < 0.35, `odd was darkest ${darkest}/${total}`);
  });

  it('is deterministic for a seed and varies between seeds', () => {
    assert.deepEqual(buildItems(42), buildItems(42));
    assert.notDeepEqual(buildItems(42), buildItems(43));
  });
});

describe('scoring contract still holds', () => {
  it('ids, axes and answers are unchanged', () => {
    assert.deepEqual(
      scoreableItems().map((i) => `${i.id}:${i.axis}:${i.correct}`),
      ['p1:protan:c', 'p2:protan:b', 'p3:protan:5', 'd1:deutan:d', 'd2:deutan:b', 'd3:deutan:2',
        't1:tritan:b', 't2:tritan:d', 't3:tritan:6', 'c1:control:c', 'c2:control:a'],
    );
    const result = scoreAnswers(
      ITEMS.map((it) => ({ itemId: it.id, choice: it.correct })),
      scoreableItems(),
    );
    assert.equal(result.type, 'normal');
    assert.deepEqual(Object.keys(result).sort(),
      ['answers', 'completedAt', 'confidence', 'controlCorrect', 'controlTotal', 'scores', 'type']);
  });

  it('plate items keep digit, figure and ground fields', () => {
    for (const it of ITEMS.filter((i) => i.kind === 'plate')) {
      assert.match(it.figure, /^#[0-9a-f]{6}$/);
      assert.match(it.ground, /^#[0-9a-f]{6}$/);
      assert.equal(it.digit, it.correct);
    }
  });
});
