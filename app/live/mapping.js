/**
 * Map a saved colour profile to the corrector input shape used by correctImageData.
 * Severity drives strength when present; otherwise profile.confidence.
 */
export function profileToCorrector(profile) {
  if (!profile || typeof profile !== 'object') return { type: 'normal', confidence: 0 };
  const type = profile.type || 'normal';
  if (type === 'normal') return { type: 'normal', confidence: 0 };
  const strength = typeof profile.severity === 'number' ? profile.severity : profile.confidence;
  const confidence =
    typeof strength === 'number' && Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 1;
  return { type, confidence };
}
