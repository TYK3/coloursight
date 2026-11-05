/**
 * Small colour-science toolkit for the screening stimuli.
 * sRGB (D65) <-> CIE XYZ / xyY, confusion lines, luminance jitter,
 * dichromat simulation (Machado et al. 2009, severity 1.0) and CIEDE2000.
 * Pure functions; no DOM.
 * @module
 */

/**
 * Copunctal points in CIE 1931 xy: every protan, deutan or tritan
 * confusion line passes through the matching point (Smith & Pokorny values
 * as used by Brettel, Viénot & Mollon).
 */
export const COPUNCTAL = Object.freeze({
  protan: Object.freeze({ x: 0.7465, y: 0.2535 }),
  deutan: Object.freeze({ x: 1.4, y: -0.4 }),
  tritan: Object.freeze({ x: 0.1748, y: 0.0044 }),
});

const XYZ_TO_RGB = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];
const RGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const D65 = [0.95047, 1, 1.08883];

/** Machado, Oliveira & Fernandes (2009), severity 1.0, applied to linear sRGB. */
const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** @param {number[][]} m @param {number[]} v */
const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

/** @param {number} c 0..1 */
export const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** @param {number} c 0..1 */
export const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** @param {string} hex #rrggbb @returns {number[]} linear RGB 0..1 */
export function hexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => toLinear(c / 255));
}

/** @param {number[]} lin linear RGB (clamped to 0..1) @returns {string} */
export function linearToHex(lin) {
  return (
    '#' +
    lin
      .map((c) => Math.round(toGamma(Math.min(1, Math.max(0, c))) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** WCAG / CIE relative luminance Y of an sRGB colour. @param {string} hex */
export function relativeLuminance(hex) {
  return mul(RGB_TO_XYZ, hexToLinear(hex))[1];
}

/** @param {string} hex @returns {{ x: number, y: number, Y: number }} */
export function hexToXyY(hex) {
  const [X, Y, Z] = mul(RGB_TO_XYZ, hexToLinear(hex));
  const s = X + Y + Z || 1;
  return { x: X / s, y: Y / s, Y };
}

/**
 * @param {number} x @param {number} y @param {number} Y
 * @returns {number[]|null} linear RGB, or null when outside the sRGB gamut
 */
export function xyYToLinear(x, y, Y) {
  const lin = mul(XYZ_TO_RGB, [(x * Y) / y, Y, ((1 - x - y) * Y) / y]);
  return lin.every((c) => c >= -1e-9 && c <= 1 + 1e-9) ? lin : null;
}

/**
 * Two colours of equal luminance Y on the confusion line of `axis` that
 * passes through chromaticity `centre`, `spread` apart on each side (xy units).
 * @param {{ axis: 'protan'|'deutan'|'tritan', centre: { x: number, y: number }, Y: number, spread: number }} spec
 * @returns {[string, string]}
 */
export function confusionPair({ axis, centre, Y, spread }) {
  const cp = COPUNCTAL[axis];
  let dx = centre.x - cp.x;
  let dy = centre.y - cp.y;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  const a = xyYToLinear(centre.x - dx * spread, centre.y - dy * spread, Y);
  const b = xyYToLinear(centre.x + dx * spread, centre.y + dy * spread, Y);
  if (!a || !b) throw new RangeError(`${axis} pair at ${centre.x},${centre.y} is out of sRGB gamut`);
  return [linearToHex(a), linearToHex(b)];
}

/**
 * Scale a colour's luminance by `factor`, keeping its chromaticity.
 * @param {string} hex @param {number} factor
 */
export function scaleLuminance(hex, factor) {
  return linearToHex(hexToLinear(hex).map((c) => c * factor));
}

/**
 * Approximate how a full dichromat sees a colour.
 * @param {string} hex @param {'protan'|'deutan'|'tritan'} axis @returns {string}
 */
export function simulateDichromat(hex, axis) {
  return linearToHex(mul(MACHADO[axis], hexToLinear(hex)));
}

/** @param {string} hex @returns {number[]} CIE L*a*b* (D65) */
export function hexToLab(hex) {
  const xyz = mul(RGB_TO_XYZ, hexToLinear(hex));
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = xyz.map((v, i) => f(v / D65[i]));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 colour difference between two L*a*b* colours. */
export function deltaE2000Lab([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (a, b) => (a === 0 && b === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
  const h1 = hue(a1p, b1);
  const h2 = hue(a2p, b2);
  const dL = L2 - L1;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hb = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) > 180) hb += hb < 360 ? 360 : -360;
    hb /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hb - 30) * rad) +
    0.24 * Math.cos(2 * hb * rad) +
    0.32 * Math.cos((3 * hb + 6) * rad) -
    0.2 * Math.cos((4 * hb - 63) * rad);
  const dT = 30 * Math.exp(-(((hb - 275) / 25) ** 2));
  const Cbp7 = Cbp ** 7;
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dT * rad) * RC;
  return Math.sqrt(
    (dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH),
  );
}

/** CIEDE2000 between two sRGB hex colours. @param {string} a @param {string} b */
export function deltaE2000(a, b) {
  return deltaE2000Lab(hexToLab(a), hexToLab(b));
}

/**
 * Small, fast seeded PRNG (mulberry32). Returns floats in [0, 1).
 * @param {number} seed
 */
export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
