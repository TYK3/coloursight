# ColourSight profile mapping

How a screening `ColourVisionResult` becomes a durable `ColourProfile`.

## Inputs

From `coloursight.result` (see `app/test/scoring.js`):

- `type`: `'protan' | 'deutan' | 'tritan' | 'normal'`
- `confidence`: `0..1`
- `scores.{protan,deutan,tritan}`: error rates `0..1` on each axis

## Severity

1. If `type === 'normal'`, **severity is always `0`**.
2. Otherwise take the error rate on the detected axis: `errorRate = scores[type]`.
3. Scale by confidence: `severity = clamp01(errorRate × confidence)`.
4. Round to **2 decimal places** (stable for UI and correction strength).

Low confidence therefore dampens reported severity even when the axis error rate is high.

## Severity labels

Derived only from the numeric `severity` (after the steps above):

| Label        | Severity range   |
|--------------|------------------|
| `none`       | `severity < 0.20` |
| `mild`       | `0.20 ≤ s < 0.45` |
| `moderate`   | `0.45 ≤ s < 0.70` |
| `strong`     | `severity ≥ 0.70` |

So a normal result is always `severityLabel: 'none'`. A high error rate with low confidence can land in `mild` or `none` rather than `strong`.

## Other profile fields

- `confidence` — copied from the result (clamped `0..1`, 2 dp).
- `source` — `'test'` when derived from a result; `'manual'` when set via `setProfile`; `'default'` for the empty fallback.
- `updatedAt` — result `completedAt` when deriving; otherwise an ISO timestamp at write time.
- `version` — always `1` for this schema.
