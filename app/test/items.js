/**
 * Colour-vision screening item bank.
 * Colours sit on approximate protan / deutan / tritan confusion lines in sRGB.
 * Stimuli are original odd-one-out swatches and simple SVG "plate" digits —
 * not Ishihara plates (those images are copyrighted).
 */

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
 */

/**
 * @typedef {OddOutItem|PlateItem} TestItem
 */

/** @type {ReadonlyArray<TestItem>} */
export const ITEMS = Object.freeze([
  // —— Protan (reds / greens along L-cone confusion) ——
  Object.freeze({
    id: 'p1',
    kind: 'odd-out',
    axis: 'protan',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#c45c4a', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#c45c4a', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#6a9a4e', label: 'Swatch C' }), // odd for normal; on protan line vs reds
      Object.freeze({ id: 'd', colour: '#c45c4a', label: 'Swatch D' }),
    ]),
    correct: 'c',
  }),
  Object.freeze({
    id: 'p2',
    kind: 'odd-out',
    axis: 'protan',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#8fbf5a', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#d07060', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#8fbf5a', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#8fbf5a', label: 'Swatch D' }),
    ]),
    correct: 'b',
  }),
  Object.freeze({
    id: 'p3',
    kind: 'plate',
    axis: 'protan',
    prompt: 'What digit do you see in the circle? Choose “None” if you see no clear digit.',
    digit: '5',
    figure: '#d07060',
    ground: '#8fbf5a',
    options: Object.freeze([
      Object.freeze({ id: '3', label: '3' }),
      Object.freeze({ id: '5', label: '5' }),
      Object.freeze({ id: '8', label: '8' }),
      Object.freeze({ id: 'none', label: 'None' }),
    ]),
    correct: '5',
  }),

  // —— Deutan (similar red–green, shifted for M-cone) ——
  Object.freeze({
    id: 'd1',
    kind: 'odd-out',
    axis: 'deutan',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#b85c6a', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#b85c6a', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#b85c6a', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#5a9a6a', label: 'Swatch D' }),
    ]),
    correct: 'd',
  }),
  Object.freeze({
    id: 'd2',
    kind: 'odd-out',
    axis: 'deutan',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#70b060', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#c06070', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#70b060', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#70b060', label: 'Swatch D' }),
    ]),
    correct: 'b',
  }),
  Object.freeze({
    id: 'd3',
    kind: 'plate',
    axis: 'deutan',
    prompt: 'What digit do you see in the circle? Choose “None” if you see no clear digit.',
    digit: '2',
    figure: '#c06070',
    ground: '#70b060',
    options: Object.freeze([
      Object.freeze({ id: '2', label: '2' }),
      Object.freeze({ id: '7', label: '7' }),
      Object.freeze({ id: '9', label: '9' }),
      Object.freeze({ id: 'none', label: 'None' }),
    ]),
    correct: '2',
  }),

  // —— Tritan (blue–yellow / S-cone) ——
  Object.freeze({
    id: 't1',
    kind: 'odd-out',
    axis: 'tritan',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#4a7ab8', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#c8b040', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#4a7ab8', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#4a7ab8', label: 'Swatch D' }),
    ]),
    correct: 'b',
  }),
  Object.freeze({
    id: 't2',
    kind: 'odd-out',
    axis: 'tritan',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#d0a830', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#d0a830', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#d0a830', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#5078b0', label: 'Swatch D' }),
    ]),
    correct: 'd',
  }),
  Object.freeze({
    id: 't3',
    kind: 'plate',
    axis: 'tritan',
    prompt: 'What digit do you see in the circle? Choose “None” if you see no clear digit.',
    digit: '6',
    figure: '#d0a830',
    ground: '#5078b0',
    options: Object.freeze([
      Object.freeze({ id: '4', label: '4' }),
      Object.freeze({ id: '6', label: '6' }),
      Object.freeze({ id: '8', label: '8' }),
      Object.freeze({ id: 'none', label: 'None' }),
    ]),
    correct: '6',
  }),

  // —— Controls (large luminance / hue difference; most people should pass) ——
  Object.freeze({
    id: 'c1',
    kind: 'odd-out',
    axis: 'control',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#2a2a2a', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#2a2a2a', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#e8e8e8', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#2a2a2a', label: 'Swatch D' }),
    ]),
    correct: 'c',
  }),
  Object.freeze({
    id: 'c2',
    kind: 'odd-out',
    axis: 'control',
    prompt: 'Which swatch looks different from the other three?',
    options: Object.freeze([
      Object.freeze({ id: 'a', colour: '#0057a8', label: 'Swatch A' }),
      Object.freeze({ id: 'b', colour: '#f0f0f0', label: 'Swatch B' }),
      Object.freeze({ id: 'c', colour: '#f0f0f0', label: 'Swatch C' }),
      Object.freeze({ id: 'd', colour: '#f0f0f0', label: 'Swatch D' }),
    ]),
    correct: 'a',
  }),
]);

/** Scoreable projection used by scoring.js */
export function scoreableItems() {
  return ITEMS.map((it) => ({
    id: it.id,
    axis: it.axis,
    correct: it.correct,
  }));
}
