// ColourSight colour correction (daltonization).
// Assistive colour remapping only, not a medical treatment.
//
// Method: convert RGB -> LMS, simulate the given colour vision deficiency,
// take the error (what the viewer loses), and shift that error into
// channels the viewer can still distinguish. Strength scales with
// profile.confidence (0..1, default 1). Unknown or missing types are
// treated as 'normal' and return an unchanged copy.

const RGB2LMS = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS2RGB = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];
const SIM = {
  protan: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]],
  deutan: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]],
  tritan: [[1, 0, 0], [0, 1, 0], [-0.395913, 0.801109, 0]],
};
// Redistributes the lost error into visible channels.
const ERR = [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]];

const mul = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
const clamp = (x) => (x < 0 ? 0 : x > 255 ? 255 : Math.round(x));

function strengthOf(profile) {
  if (!profile || !SIM[profile.type]) return 0;
  const c = profile.confidence;
  return typeof c === 'number' && Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 1;
}

/** Correct one pixel. Returns [r, g, b] (0..255 ints). */
export function correctRgb(r, g, b, profile) {
  const k = strengthOf(profile);
  if (k === 0) return [r, g, b];
  const rgb = [r, g, b];
  const sim = mul(LMS2RGB, mul(SIM[profile.type], mul(RGB2LMS, rgb)));
  const shift = mul(ERR, [r - sim[0], g - sim[1], b - sim[2]]);
  return [clamp(r + k * shift[0]), clamp(g + k * shift[1]), clamp(b + k * shift[2])];
}

/**
 * Correct an ImageData-like frame { width, height, data: Uint8ClampedArray RGBA }.
 * Never mutates the input; returns a new frame (a real ImageData when available).
 */
export function correctImageData(imageData, profile) {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data);
  if (strengthOf(profile) > 0) {
    for (let i = 0; i < out.length; i += 4) {
      const [r, g, b] = correctRgb(out[i], out[i + 1], out[i + 2], profile);
      out[i] = r; out[i + 1] = g; out[i + 2] = b;
    }
  }
  if (typeof ImageData !== 'undefined') return new ImageData(out, width, height);
  return { width, height, data: out };
}
