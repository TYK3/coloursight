/**
 * ColourSight shell polish: focus management, skip link, titles and empty states.
 * Loaded after the router and feature modules; edits nothing inside feature roots.
 */
import { getProfile, subscribe } from '../profile/profile.js';
import { emptyStateFor, titleFor } from './empty-state.js';

const NOTICE_CLASS = 'cs-polish-empty';

function visibleView() {
  return document.querySelector('[data-view]:not([hidden])');
}

function routeOf(view) {
  return view?.getAttribute('data-view') || 'home';
}

/** Make every view heading programmatically focusable. */
function prepareHeadings() {
  document.querySelectorAll('[data-view] > h1').forEach((h) => {
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
  });
}

function focusHeading() {
  const h = visibleView()?.querySelector(':scope > h1');
  if (h instanceof HTMLElement) h.focus({ preventScroll: false });
}

function updateTitle() {
  const view = visibleView();
  const heading = view?.querySelector(':scope > h1')?.textContent?.trim();
  document.title = titleFor(routeOf(view), heading);
}

/** @param {HTMLElement} section @param {ReturnType<typeof emptyStateFor>} state */
function renderNotice(section, state) {
  let notice = section.querySelector(`:scope > .${NOTICE_CLASS}`);
  if (!state) {
    notice?.remove();
    return;
  }
  if (!notice) {
    notice = document.createElement('div');
    notice.className = NOTICE_CLASS;
    notice.setAttribute('role', 'note');
    section.querySelector(':scope > h1')?.after(notice);
  }
  notice.innerHTML = '';
  const title = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = state.title;
  title.append(strong);
  const body = document.createElement('p');
  body.textContent = state.body;
  const linkP = document.createElement('p');
  const link = document.createElement('a');
  link.className = 'button';
  link.href = state.href;
  link.textContent = state.linkText;
  linkP.append(link);
  notice.append(title, body, linkP);
}

function updateEmptyStates() {
  const profile = getProfile();
  document.querySelectorAll('[data-view]').forEach((section) => {
    if (!(section instanceof HTMLElement)) return;
    renderNotice(section, emptyStateFor(section.dataset.view || '', profile));
  });
}

/** The skip link points at #main, which the hash router would treat as an unknown route. */
function wireSkipLink() {
  document.querySelectorAll('a.skip-link[href="#main"]').forEach((a) => {
    a.addEventListener('click', (event) => {
      event.preventDefault();
      const main = document.getElementById('main');
      const h = visibleView()?.querySelector(':scope > h1');
      (h instanceof HTMLElement ? h : main)?.focus();
    });
  });
}

function init() {
  prepareHeadings();
  wireSkipLink();
  updateEmptyStates();
  updateTitle();
  // Registered after the router's listener, so the right view is already visible.
  window.addEventListener('hashchange', () => {
    updateEmptyStates();
    updateTitle();
    focusHeading();
  });
  subscribe(() => updateEmptyStates());
  window.addEventListener('storage', () => updateEmptyStates());
}

init();
