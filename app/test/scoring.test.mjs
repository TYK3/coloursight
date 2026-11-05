import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAnswers, summariseResult, ELEVATED_THRESHOLD } from './scoring.js';

const items = [
  { id: 'p1', axis: 'protan', correct: 'c' },
  { id: 'p2', axis: 'protan', correct: 'b' },
  { id: 'p3', axis: 'protan', correct: '5' },
  { id: 'd1', axis: 'deutan', correct: 'd' },
  { id: 'd2', axis: 'deutan', correct: 'b' },
  { id: 'd3', axis: 'deutan', correct: '2' },
  { id: 't1', axis: 'tritan', correct: 'b' },
  { id: 't2', axis: 'tritan', correct: 'd' },
  { id: 't3', axis: 'tritan', correct: '6' },
  { id: 'c1', axis: 'control', correct: 'c' },
  { id: 'c2', axis: 'control', correct: 'a' },
];

const fixedNow = () => new Date('2026-11-05T12:00:00.000Z');

describe('scoreAnswers', () => {
  it('classifies all-correct as normal with high confidence', () => {
    const answers = items.map((it) => ({ itemId: it.id, choice: it.correct }));
    const result = scoreAnswers(answers, items, { now: fixedNow });
    assert.equal(result.type, 'normal');
    assert.equal(result.scores.protan, 0);
    assert.equal(result.scores.deutan, 0);
    assert.equal(result.scores.tritan, 0);
    assert.ok(result.confidence >= 0.9);
    assert.equal(result.completedAt, '2026-11-05T12:00:00.000Z');
    assert.equal(result.controlCorrect, 2);
    assert.equal(result.controlTotal, 2);
    assert.equal(result.answers.length, items.length);
    assert.ok(result.answers.every((a) => a.correct));
  });

  it('flags protan when only protan items are missed', () => {
    const answers = items.map((it) => ({
      itemId: it.id,
      choice: it.axis === 'protan' ? 'wrong' : it.correct,
    }));
    const result = scoreAnswers(answers, items, { now: fixedNow });
    assert.equal(result.type, 'protan');
    assert.equal(result.scores.protan, 1);
    assert.equal(result.scores.deutan, 0);
    assert.equal(result.scores.tritan, 0);
    assert.ok(result.confidence >= ELEVATED_THRESHOLD);
  });

  it('flags deutan when deutan items are mostly wrong', () => {
    const answers = items.map((it) => {
      if (it.axis === 'deutan') return { itemId: it.id, choice: 'x' };
      return { itemId: it.id, choice: it.correct };
    });
    const result = scoreAnswers(answers, items, { now: fixedNow });
    assert.equal(result.type, 'deutan');
    assert.equal(result.scores.deutan, 1);
  });

  it('flags tritan similarly', () => {
    const answers = items.map((it) => ({
      itemId: it.id,
      choice: it.axis === 'tritan' ? null : it.correct,
    }));
    const result = scoreAnswers(answers, items, { now: fixedNow });
    assert.equal(result.type, 'tritan');
    assert.equal(result.scores.tritan, 1);
  });

  it('reduces confidence when controls fail', () => {
    const good = scoreAnswers(
      items.map((it) => ({
        itemId: it.id,
        choice: it.axis === 'protan' ? 'x' : it.correct,
      })),
      items,
      { now: fixedNow },
    );
    const badControls = scoreAnswers(
      items.map((it) => ({
        itemId: it.id,
        choice: it.axis === 'control' || it.axis === 'protan' ? 'x' : it.correct,
      })),
      items,
      { now: fixedNow },
    );
    assert.equal(good.type, 'protan');
    assert.equal(badControls.type, 'protan');
    assert.ok(badControls.confidence < good.confidence);
  });
});

describe('summariseResult', () => {
  it('returns plain-language headline for normal', () => {
    const result = scoreAnswers(
      items.map((it) => ({ itemId: it.id, choice: it.correct })),
      items,
      { now: fixedNow },
    );
    const summary = summariseResult(result);
    assert.match(summary.headline, /do not suggest a colour-confusion pattern/i);
    assert.match(summary.detail, /Confidence/i);
    assert.doesNotMatch(summary.detail, /protan \d/);
  });

  it('names a protan pattern in plain language', () => {
    const result = scoreAnswers(
      items.map((it) => ({
        itemId: it.id,
        choice: it.axis === 'protan' ? 'wrong' : it.correct,
      })),
      items,
      { now: fixedNow },
    );
    const summary = summariseResult(result);
    assert.equal(
      summary.headline,
      'Your answers suggest red–green confusion (protan type)',
    );
  });
});
