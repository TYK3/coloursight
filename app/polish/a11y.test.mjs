// Static accessibility checks for the shell + pure empty-state helpers.
// Run: node --test app/polish/a11y.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyStateFor, needsTestPrompt, titleFor, PROFILE_ROUTES } from './empty-state.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./polish.css', import.meta.url), 'utf8');

test('document language is British English', () => {
  assert.match(html, /<html lang="en-GB">/);
});

test('skip link targets the focusable main landmark', () => {
  assert.match(html, /<a class="skip-link" href="#main">/);
  assert.match(html, /<main id="main" tabindex="-1">/);
});

test('every view has exactly one h1', () => {
  const views = [...html.matchAll(/<section[^>]*data-view="([^"]+)"[\s\S]*?<\/section>/g)];
  assert.ok(views.length >= 5);
  for (const [block, name] of views) {
    assert.equal((block.match(/<h1\b/g) || []).length, 1, `#${name}`);
  }
});

test('no "Coming soon" stubs remain; settings and camera are reachable', () => {
  assert.doesNotMatch(html, /Coming soon/i);
  assert.match(html, /<div id="settings-root"><\/div>/);
  assert.match(html, /href="settings\/settings\.css"/);
  assert.match(html, /src="settings\/settings\.js"/);
  assert.match(html, /href="camera\/"/);
});

test('polish stylesheet and script load last', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(links.at(-1), 'polish/polish.css');
  assert.equal(scripts.at(-1), 'polish/polish.js');
  assert.ok(scripts.indexOf('lib/router.js') < scripts.indexOf('polish/polish.js'));
});

test('polish.css covers focus, tap targets, media scaling and reduced motion', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /img, svg, video, canvas \{ max-width: 100%; \}/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('needsTestPrompt only for the default profile', () => {
  assert.equal(needsTestPrompt(null), true);
  assert.equal(needsTestPrompt({ source: 'default' }), true);
  assert.equal(needsTestPrompt({ source: 'test' }), false);
  assert.equal(needsTestPrompt({ source: 'manual' }), false);
});

test('empty states link to the test on profile routes only', () => {
  for (const route of PROFILE_ROUTES) {
    const s = emptyStateFor(route, { source: 'default' });
    assert.ok(s && s.href === '#test' && s.body.length > 20, route);
    assert.equal(emptyStateFor(route, { source: 'manual' }), null);
  }
  assert.equal(emptyStateFor('home', { source: 'default' }), null);
  assert.equal(emptyStateFor('test', null), null);
});

test('titles are route-specific', () => {
  assert.match(titleFor('home'), /^ColourSight/);
  assert.equal(titleFor('settings', 'Settings'), 'Settings – ColourSight');
});
