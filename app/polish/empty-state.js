/**
 * Pure helpers for ColourSight empty states (no DOM; unit-tested in node).
 */

/** Routes that depend on a profile or test result. */
export const PROFILE_ROUTES = Object.freeze(['preview', 'settings', 'camera']);

/**
 * True when nothing personal is stored: no saved profile and no test result.
 * @param {{ source?: string } | null | undefined} profile
 */
export function needsTestPrompt(profile) {
  return !profile || !profile.source || profile.source === 'default';
}

/**
 * Helpful copy for a route when no profile exists, or null when none is needed.
 * @param {string} route
 * @param {{ source?: string } | null | undefined} profile
 * @returns {{ title: string, body: string, linkText: string, href: string } | null}
 */
export function emptyStateFor(route, profile) {
  if (!PROFILE_ROUTES.includes(route) || !needsTestPrompt(profile)) return null;
  const common = { linkText: 'Take the colour-vision test', href: '#test' };
  switch (route) {
    case 'preview':
      return {
        ...common,
        title: 'No colour profile yet',
        body: 'Without a profile the “after” image will look the same as the original. Take the short test first, or choose a type in Settings.',
      };
    case 'settings':
      return {
        ...common,
        title: 'No test result on this device',
        body: 'You can choose a type and intensity below, but the quickest way to get a personalised profile is the short colour-vision test.',
      };
    case 'camera':
      return {
        ...common,
        title: 'No colour profile yet',
        body: 'Live correction uses your colour profile. Take the short test first so the camera knows what to correct.',
      };
    default:
      return null;
  }
}

/**
 * Document title for a route.
 * @param {string} route
 * @param {string} [heading]
 */
export function titleFor(route, heading) {
  if (!route || route === 'home') return 'ColourSight – colour-vision test and correction';
  return `${heading || route} – ColourSight`;
}
