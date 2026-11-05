/**
 * Pure scoring for the ColourSight colour-vision screening test.
 * No DOM, no localStorage — unit-testable with node --test.
 */

/**
 * @typedef {'protan'|'deutan'|'tritan'|'normal'} ColourVisionType
 *
 * @typedef {Object} ColourVisionScores
 * @property {number} protan Error rate 0..1 on protan-targeted items
 * @property {number} deutan Error rate 0..1 on deutan-targeted items
 * @property {number} tritan Error rate 0..1 on tritan-targeted items
 *
 * @typedef {Object} ColourVisionAnswer
 * @property {string} itemId
 * @property {string|number|null} choice
 * @property {boolean} correct
 * @property {'protan'|'deutan'|'tritan'|'control'} axis
 *
 * @typedef {Object} ColourVisionResult
 * @property {ColourVisionType} type Screening classification (not a diagnosis)
 * @property {number} confidence 0..1 how separated the top score is from the rest
 * @property {ColourVisionScores} scores
 * @property {ColourVisionAnswer[]} answers
 * @property {string} completedAt ISO-8601 timestamp
 * @property {number} controlCorrect Number of control items answered correctly
 * @property {number} controlTotal Total control items
 */

/** Error-rate threshold above which an axis is treated as elevated. */
export const ELEVATED_THRESHOLD = 0.4;

/**
 * @typedef {Object} ScoreableItem
 * @property {string} id
 * @property {'protan'|'deutan'|'tritan'|'control'} axis
 * @property {string|number} correct
 */

/**
 * Score a list of answers against the item bank.
 * @param {ReadonlyArray<{ itemId: string, choice: string|number|null }>} rawAnswers
 * @param {ReadonlyArray<ScoreableItem>} items
 * @param {{ now?: () => Date }} [opts]
 * @returns {ColourVisionResult}
 */
export function scoreAnswers(rawAnswers, items, opts = {}) {
  const now = opts.now ? opts.now() : new Date();
  const byId = new Map(items.map((it) => [it.id, it]));

  /** @type {ColourVisionAnswer[]} */
  const answers = rawAnswers.map((raw) => {
    const item = byId.get(raw.itemId);
    if (!item) {
      return {
        itemId: raw.itemId,
        choice: raw.choice,
        correct: false,
        axis: /** @type {'control'} */ ('control'),
      };
    }
    const correct = raw.choice !== null && String(raw.choice) === String(item.correct);
    return {
      itemId: raw.itemId,
      choice: raw.choice,
      correct,
      axis: item.axis,
    };
  });

  const axes = /** @type {const} */ (['protan', 'deutan', 'tritan']);
  /** @type {ColourVisionScores} */
  const scores = { protan: 0, deutan: 0, tritan: 0 };

  for (const axis of axes) {
    const forAxis = answers.filter((a) => a.axis === axis);
    if (forAxis.length === 0) {
      scores[axis] = 0;
    } else {
      const errors = forAxis.filter((a) => !a.correct).length;
      scores[axis] = errors / forAxis.length;
    }
  }

  const controls = answers.filter((a) => a.axis === 'control');
  const controlCorrect = controls.filter((a) => a.correct).length;
  const controlTotal = controls.length;

  const ranked = axes
    .map((axis) => ({ axis, score: scores[axis] }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const second = ranked[1];
  const elevated = top.score >= ELEVATED_THRESHOLD;

  /** @type {ColourVisionType} */
  let type = 'normal';
  if (elevated) {
    type = top.axis;
  }

  // Confidence: how clearly the top axis stands out (or how clearly all are low).
  let confidence;
  if (type === 'normal') {
    const maxScore = top.score;
    confidence = clamp01(1 - maxScore / ELEVATED_THRESHOLD);
  } else {
    const gap = top.score - second.score;
    confidence = clamp01(0.35 + gap * 0.9 + (top.score - ELEVATED_THRESHOLD) * 0.5);
  }

  // Soften confidence if the user failed controls (suggests guessing / display issues).
  if (controlTotal > 0) {
    const controlRate = controlCorrect / controlTotal;
    if (controlRate < 1) {
      confidence = clamp01(confidence * (0.5 + 0.5 * controlRate));
    }
  }

  return {
    type,
    confidence: round2(confidence),
    scores: {
      protan: round2(scores.protan),
      deutan: round2(scores.deutan),
      tritan: round2(scores.tritan),
    },
    answers,
    completedAt: now.toISOString(),
    controlCorrect,
    controlTotal,
  };
}

/**
 * Plain-language summary for the result screen (screening disclaimer included by caller UI).
 * @param {ColourVisionResult} result
 * @returns {{ headline: string, detail: string }}
 */
export function summariseResult(result) {
  const labels = {
    normal: 'Your answers do not suggest a colour-confusion pattern',
    protan: 'Your answers suggest red–green confusion (protan type)',
    deutan: 'Your answers suggest red–green confusion (deutan type)',
    tritan: 'Your answers suggest blue–yellow confusion (tritan type)',
  };
  const headline = labels[result.type] ?? labels.normal;
  const pct = (n) => `${Math.round(n * 100)}%`;
  const detail = `Confidence ${pct(result.confidence)}.`;
  return { headline, detail };
}

/** @param {number} n */
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/** @param {number} n */
function round2(n) {
  return Math.round(n * 100) / 100;
}
