import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correctorForHome, captionForHome, explainForHome, HOME_FALLBACK_CORRECTOR } from './home.js';

test('falls back to deutan moderate when there is no real profile', () => {
  for (const p of [null, undefined, {}, { type: 'normal', source: 'default' }]) {
    assert.deepEqual(correctorForHome(p), HOME_FALLBACK_CORRECTOR);
  }
});

test('uses the active profile when it would apply a remapping', () => {
  assert.deepEqual(
    correctorForHome({ type: 'protan', severity: 0.3, source: 'test' }),
    { type: 'protan', confidence: 0.3 },
  );
});

test('caption names the active profile, or labels the fallback example', () => {
  assert.match(captionForHome(null), /example profile: deutan, moderate/i);
  assert.match(
    captionForHome({ type: 'tritan', severity: 0.5, severityLabel: 'moderate', source: 'test' }),
    /your profile: tritan, moderate/i,
  );
});

test('explain line names red/green for the deutan fallback and protan, blue/green for tritan', () => {
  assert.match(explainForHome(null), /reds and greens/i);
  assert.match(explainForHome({ type: 'protan', severity: 0.4, source: 'test' }), /reds and greens/i);
  assert.match(explainForHome({ type: 'tritan', severity: 0.4, source: 'test' }), /blues and greens/i);
});
