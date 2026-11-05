/**
 * Dotted "plate" stimuli (original artwork, not Ishihara).
 * The whole disc is filled with evenly packed, non-overlapping dots drawn from
 * one shared size range, independent of the digit. Only afterwards is each dot
 * coloured: figure colour if its centre falls inside the digit mask, ground
 * colour otherwise, each with its own lightness noise. So the digit can't be
 * read from dot size, spacing or brightness, only from hue.
 * Deterministic for a given seed.
 * @module
 */

import { scaleLuminance, seededRandom } from './colour.js';

export const PLATE_SIZE = 220;
/** Radius of the dotted area (the dark backing disc is slightly larger). */
export const PLATE_RADIUS = 104;
/** Per-dot lightness noise: luminance scaled by 1 ± PLATE_NOISE. */
export const PLATE_NOISE = 0.12;

/** Dot radii, packed largest first; each pass jitters radius by ±6 %. */
const RADIUS_PASSES = [6, 5.2, 4.5, 3.8, 3.2, 2.6];
const ATTEMPTS_PER_PASS = 6000;
const GAP = 0.7;

/** Digit box half-size in px (u, v) and stroke half-width. */
const HALF_W = 36;
const HALF_H = 58;
const STROKE = 13;

/**
 * @param {number} cu @param {number} cv @param {number} ru @param {number} rv
 * @param {number} a0 start angle (deg, 0 = right, 90 = down) @param {number} a1 end angle
 * @returns {[number, number][]}
 */
function arc(cu, cv, ru, rv, a0, a1) {
  const pts = [];
  const steps = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 10));
  for (let i = 0; i <= steps; i += 1) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    pts.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]);
  }
  return pts;
}

/** Digit skeletons as polylines in a box u ∈ [-1, 1], v ∈ [-1, 1] (v down). */
const SIX = [arc(0, 0.4, 0.9, 0.6, 0, 360), arc(0.9, 0.4, 1.8, 1.4, 180, 265)];
/** @type {Record<string, [number, number][][]>} */
const DIGITS = {
  0: [arc(0, 0, 0.95, 1, 0, 360)],
  1: [[[-0.35, -0.7], [0.1, -1], [0.1, 1]]],
  2: [[...arc(0, -0.45, 0.9, 0.55, 190, 390), [-0.9, 1], [1, 1]]],
  3: [arc(0, -0.5, 0.85, 0.5, 200, 450), arc(0, 0.5, 0.9, 0.5, 270, 520)],
  4: [[[0.5, 1], [0.5, -1], [-1, 0.4], [1, 0.4]]],
  5: [[[0.9, -1], [-0.75, -1], [-0.85, -0.05], ...arc(0, 0.4, 0.95, 0.6, 240, 500)]],
  6: SIX,
  7: [[[-0.9, -1], [0.9, -1], [-0.2, 1]]],
  8: [arc(0, -0.5, 0.75, 0.5, 0, 360), arc(0, 0.5, 0.9, 0.5, 0, 360)],
  9: SIX.map((line) => line.map(([u, v]) => [-u, -v])),
};

/** @param {number} px @param {number} py @param {number[]} a @param {number[]} b */
function segDist(px, py, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/**
 * Mask for a digit in plate pixel coordinates.
 * @param {string} digit
 * @returns {(x: number, y: number) => boolean}
 */
export function digitMask(digit) {
  const c = PLATE_SIZE / 2;
  const lines = (DIGITS[digit] ?? DIGITS[1]).map((line) =>
    line.map(([u, v]) => [c + u * HALF_W, c + v * HALF_H]),
  );
  return (x, y) => {
    for (const line of lines) {
      for (let i = 1; i < line.length; i += 1) {
        if (segDist(x, y, line[i - 1], line[i]) <= STROKE) return true;
      }
    }
    return false;
  };
}

/**
 * Evenly packed dots in the disc (random sequential packing, largest first).
 * @param {() => number} rand
 * @returns {{ x: number, y: number, r: number }[]}
 */
function packDots(rand) {
  const c = PLATE_SIZE / 2;
  const cell = 2 * RADIUS_PASSES[0] * 1.06 + GAP;
  /** @type {Map<string, { x: number, y: number, r: number }[]>} */
  const grid = new Map();
  const key = (i, j) => `${i},${j}`;
  const dots = [];

  for (const base of RADIUS_PASSES) {
    for (let n = 0; n < ATTEMPTS_PER_PASS; n += 1) {
      const r = base * (1 + (rand() - 0.5) * 0.12);
      const rho = Math.sqrt(rand()) * (PLATE_RADIUS - r);
      const theta = rand() * Math.PI * 2;
      const x = c + rho * Math.cos(theta);
      const y = c + rho * Math.sin(theta);
      const gi = Math.floor(x / cell);
      const gj = Math.floor(y / cell);
      let free = true;
      for (let i = gi - 1; i <= gi + 1 && free; i += 1) {
        for (let j = gj - 1; j <= gj + 1 && free; j += 1) {
          for (const d of grid.get(key(i, j)) ?? []) {
            if (Math.hypot(d.x - x, d.y - y) < d.r + r + GAP) {
              free = false;
              break;
            }
          }
        }
      }
      if (!free) continue;
      const dot = { x, y, r };
      dots.push(dot);
      const k = key(gi, gj);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(dot);
    }
  }
  return dots;
}

/**
 * @typedef {Object} PlateDot
 * @property {number} x
 * @property {number} y
 * @property {number} r
 * @property {string} fill
 * @property {boolean} figure true when the dot is part of the digit
 */

/**
 * @param {{ digit: string, figure: string, ground: string, seed: number }} opts
 * @returns {{ size: number, radius: number, dots: PlateDot[] }}
 */
export function generatePlate({ digit, figure, ground, seed }) {
  const rand = seededRandom(seed);
  const inside = digitMask(digit);
  const dots = packDots(rand).map((d) => {
    const isFigure = inside(d.x, d.y);
    const factor = 1 + (rand() * 2 - 1) * PLATE_NOISE;
    return { ...d, fill: scaleLuminance(isFigure ? figure : ground, factor), figure: isFigure };
  });
  return { size: PLATE_SIZE, radius: PLATE_RADIUS, dots };
}

/**
 * SVG markup for a plate. The digit itself never appears in the markup.
 * @param {{ digit: string, figure: string, ground: string }} item
 * @param {number} seed
 */
export function plateSvg(item, seed) {
  const { dots } = generatePlate({ ...item, seed });
  const c = PLATE_SIZE / 2;
  const circles = dots
    .map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(2)}" fill="${d.fill}"/>`)
    .join('');
  return `<svg class="cs-test__plate" viewBox="0 0 ${PLATE_SIZE} ${PLATE_SIZE}" role="img" aria-label="Colour plate: a circle of coloured dots that may contain a digit"><circle cx="${c}" cy="${c}" r="108" fill="#222"/>${circles}</svg>`;
}
