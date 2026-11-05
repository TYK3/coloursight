/**
 * Colour-vision screening item bank.
 * Each targeted item uses a pair of colours on a real protan, deutan or tritan
 * confusion line (a straight line in CIE 1931 xy through that type's copunctal
 * point), with matched luminance. Every swatch then gets a small random
 * lightness jitter so brightness can't reveal the odd one out.
 * Stimuli are original odd-one-out swatches and dotted SVG "plate" digits —
 * not Ishihara plates (those images are copyrighted).
 */

import { confusionPair, scaleLuminance, seededRandom } from './colour.js';

/**
 * @typedef {Object} SwatchOption
 * @property {string} id
 * @property {string} colour CSS colour
 * @property {string} label Accessible label (not colour-alone for the control chrome)
 */

/**
 * @typedef {Object} OddOutItem
 * @property {string} id
 * @property {'odd-out'} kind
 * @property {'protan'|'deutan'|'tritan'|'control'} axis
 * @property {string} prompt
 * @property {SwatchOption[]} options
 * @property {string} correct Option id of the odd one out
 * @property {[string, string]} [pair] Base confusion pair [majority, odd] before jitter
 */

/**
 * @typedef {Object} PlateItem
 * @property {string} id
 * @property {'plate'} kind
 * @property {'protan'|'deutan'|'tritan'|'control'} axis
 * @property {string} prompt
 * @property {string} digit Digit rendered in the plate (correct answer as string)
 * @property {string} figure Colour of the figure dots
 * @property {string} ground Colour of the ground dots
 * @property {{ id: string, label: string }[]} options Answer choices (digit strings + "none")
 * @property {string} correct
 * @property {[string, string]} [pair] Base confusion pair [figure, ground]
 */

/**
 * @typedef {OddOutItem|PlateItem} TestItem
 */

/** Max relative luminance jitter per swatch (±8 % of Y, about ±2 L*). */
export const SWATCH_JITTER = 0.08;

const ODD_PROMPT = 'Which swatch looks different from the other three?';
const PLATE_PROMPT = 'What digit do you see in the circle? Choose “None” if you see no clear digit.';

/**
 * Item specs. `centre` is a CIE xy chromaticity, `Y` the shared luminance and
 * `spread` the xy distance of each colour from the centre along the confusion line.
 * Values were checked to stay in the sRGB gamut, to give CIEDE2000 >= 12 for
 * normal vision and <= 4 under a severity-1.0 dichromat simulation.
 */
const SPECS = [
  // —— Protan (L-cone confusion lines: orange/brown vs olive/green) ——
  { id: 'p1', axis: 'protan', kind: 'odd-out', centre: { x: 0.4, y: 0.4 }, Y: 0.25, spread: 0.035, correct: 'c' },
  { id: 'p2', axis: 'protan', kind: 'odd-out', centre: { x: 0.38, y: 0.41 }, Y: 0.3, spread: 0.04, correct: 'b', swap: true },
  { id: 'p3', axis: 'protan', kind: 'plate', centre: { x: 0.36, y: 0.42 }, Y: 0.35, spread: 0.035, digit: '5', choices: ['3', '5', '8'] },
  // —— Deutan (M-cone confusion lines) ——
  { id: 'd1', axis: 'deutan', kind: 'odd-out', centre: { x: 0.39, y: 0.4 }, Y: 0.28, spread: 0.035, correct: 'd' },
  { id: 'd2', axis: 'deutan', kind: 'odd-out', centre: { x: 0.4, y: 0.4 }, Y: 0.25, spread: 0.045, correct: 'b', swap: true },
  { id: 'd3', axis: 'deutan', kind: 'plate', centre: { x: 0.37, y: 0.42 }, Y: 0.3, spread: 0.035, digit: '2', choices: ['2', '7', '9'] },
  // —— Tritan (S-cone confusion lines: violet/pink vs yellow-green, blue-grey vs green) ——
  { id: 't1', axis: 'tritan', kind: 'odd-out', centre: { x: 0.34, y: 0.34 }, Y: 0.3, spread: 0.03, correct: 'b' },
  { id: 't2', axis: 'tritan', kind: 'odd-out', centre: { x: 0.33, y: 0.36 }, Y: 0.35, spread: 0.035, correct: 'd', swap: true },
  { id: 't3', axis: 'tritan', kind: 'plate', centre: { x: 0.38, y: 0.36 }, Y: 0.25, spread: 0.035, digit: '6', choices: ['4', '6', '8'] },
];

/** Controls: large luminance difference; most people should pass. */
const CONTROLS = [
  { id: 'c1', base: '#2a2a2a', odd: '#e8e8e8', correct: 'c' },
  { id: 'c2', base: '#f0f0f0', odd: '#0057a8', correct: 'a' },
];

const LETTERS = ['a', 'b', 'c', 'd'];

/**
 * Build the item bank. Colours on the confusion lines are fixed; the lightness
 * jitter comes from `seed`, so a page load gets fresh jitter and tests are repeatable.
 * @param {number} seed
 * @returns {ReadonlyArray<TestItem>}
 */
export function buildItems(seed) {
  const rand = seededRandom(seed);
  const jitter = (hex) => scaleLuminance(hex, 1 + (rand() * 2 - 1) * SWATCH_JITTER);
  /** @type {TestItem[]} */
  const items = [];

  for (const spec of SPECS) {
    const [a, b] = confusionPair(spec);
    const pair = /** @type {[string, string]} */ (spec.swap ? [b, a] : [a, b]);
    if (spec.kind === 'odd-out') {
      items.push({
        id: spec.id,
        kind: 'odd-out',
        axis: spec.axis,
        prompt: ODD_PROMPT,
        pair,
        options: LETTERS.map((id) => ({
          id,
          colour: jitter(id === spec.correct ? pair[1] : pair[0]),
          label: `Swatch ${id.toUpperCase()}`,
        })),
        correct: spec.correct,
      });
    } else {
      items.push({
        id: spec.id,
        kind: 'plate',
        axis: spec.axis,
        prompt: PLATE_PROMPT,
        digit: spec.digit,
        pair,
        figure: pair[0],
        ground: pair[1],
        options: [...spec.choices.map((d) => ({ id: d, label: d })), { id: 'none', label: 'None' }],
        correct: spec.digit,
      });
    }
  }

  for (const c of CONTROLS) {
    items.push({
      id: c.id,
      kind: 'odd-out',
      axis: 'control',
      prompt: ODD_PROMPT,
      options: LETTERS.map((id) => ({
        id,
        colour: id === c.correct ? c.odd : c.base,
        label: `Swatch ${id.toUpperCase()}`,
      })),
      correct: c.correct,
    });
  }

  return deepFreeze(items);
}

/** @template T @param {T} o @returns {T} */
function deepFreeze(o) {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

/** Item bank for this page load (fresh lightness jitter each load). */
export const ITEMS = buildItems(Math.floor(Math.random() * 2 ** 32));

/** Scoreable projection used by scoring.js */
export function scoreableItems() {
  return ITEMS.map((it) => ({
    id: it.id,
    axis: it.axis,
    correct: it.correct,
  }));
}
