/**
 * ColourSight multi-step colour-vision screening UI.
 * Self-mounts into #colour-test-root (or #view-test) when this module loads.
 */

import { ITEMS, scoreableItems } from './items.js';
import { scoreAnswers, summariseResult } from './scoring.js';
import { commitResult, loadResult } from './result.js';
import { plateSvg } from './plate.js';

export { scoreAnswers, summariseResult } from './scoring.js';
export { ITEMS, scoreableItems } from './items.js';
export { saveResult, commitResult, loadResult, RESULT_STORAGE_KEY } from './result.js';

/** @typedef {import('./scoring.js').ColourVisionResult} ColourVisionResult */

const TOTAL_STEPS = ITEMS.length; // intro + items + result handled as phases

/**
 * @typedef {'intro'|'item'|'result'} Phase
 */

function mountRoot() {
  const existing = document.getElementById('colour-test-root');
  if (existing) return existing;
  const section = document.getElementById('view-test');
  if (!section) return null;
  const root = document.createElement('div');
  root.id = 'colour-test-root';
  section.appendChild(root);
  return root;
}

/**
 * Stable per-item seed so a plate looks the same across re-renders within a
 * session but differs between sessions.
 * @param {number} sessionSeed
 * @param {string} id
 */
function plateSeed(sessionSeed, id) {
  let h = sessionSeed >>> 0;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  return h;
}

export class ColourVisionTest {
  /**
   * @param {HTMLElement} root
   */
  constructor(root) {
    this.root = root;
    /** @type {Phase} */
    this.phase = 'intro';
    this.index = 0;
    /** @type {Record<string, string|number|null>} */
    this.choices = Object.create(null);
    /** @type {ColourVisionResult|null} */
    this.result = loadResult();
    this.plateSessionSeed = Math.floor(Math.random() * 2 ** 32);
    this.root.classList.add('cs-test');
    this.render();
  }

  start() {
    this.phase = 'item';
    this.index = 0;
    this.choices = Object.create(null);
    this.result = null;
    this.render({ focusHeading: true });
  }

  /** @param {{ focusHeading?: boolean }} [opts] */
  render(opts = {}) {
    if (this.phase === 'intro') {
      this.root.innerHTML = this.introHtml();
      this.bindIntro();
    } else if (this.phase === 'result' && this.result) {
      this.root.innerHTML = this.resultHtml(this.result);
      this.bindResult();
    } else {
      const item = ITEMS[this.index];
      this.root.innerHTML = this.itemHtml(item, this.index);
      this.bindItem(item);
    }
    if (opts.focusHeading) {
      const h = this.root.querySelector('h2');
      if (h instanceof HTMLElement) {
        h.setAttribute('tabindex', '-1');
        h.focus();
      }
    }
  }

  introHtml() {
    const prior = this.result
      ? `<p class="cs-test__lead">You have a previous screening result stored on this device (${escapeHtml(this.result.type)}, confidence ${Math.round(this.result.confidence * 100)}%). You can retake the test below.</p>`
      : '';
    return `
      <p class="cs-test__progress">Colour-vision screening</p>
      <h2 class="cs-test__heading" id="cs-test-heading">About this test</h2>
      <p class="cs-test__lead">You will see ${TOTAL_STEPS} short steps. Some ask you to pick the odd swatch out; others ask which digit you can read in a dotted circle. Take your time, and make your best guess if you're unsure.</p>
      ${prior}
      <p class="cs-test__disclaimer"><strong>Screening only.</strong> This is not a clinical diagnosis. Results stay on your device and can guide the camera colour correction later.</p>
      <div class="cs-test__nav">
        <button type="button" class="cs-test__primary" data-action="start">Start test</button>
      </div>
    `;
  }

  bindIntro() {
    this.root.querySelector('[data-action="start"]')?.addEventListener('click', () => this.start());
  }

  /**
   * @param {import('./items.js').TestItem} item
   * @param {number} index
   */
  itemHtml(item, index) {
    const step = index + 1;
    const selected = this.choices[item.id] ?? null;
    let stimulus = '';
    let choices = '';

    if (item.kind === 'odd-out') {
      stimulus = `<ul class="cs-test__swatches" role="list">
        ${item.options
          .map(
            (opt) => `
          <li>
            <button type="button" class="cs-test__swatch" data-choice="${escapeAttr(opt.id)}"
              aria-pressed="${selected === opt.id ? 'true' : 'false'}"
              aria-label="${escapeAttr(opt.label)}">
              <span class="cs-test__swatch-chip" style="background:${escapeAttr(opt.colour)}"></span>
              <span class="cs-test__swatch-label">${escapeHtml(opt.label)}</span>
              <span class="cs-test__swatch-selected" aria-hidden="true"${selected === opt.id ? '' : ' hidden'}>✓ Selected</span>
            </button>
          </li>`,
          )
          .join('')}
      </ul>`;
    } else {
      stimulus = `<div class="cs-test__plate-wrap">${plateSvg(item, plateSeed(this.plateSessionSeed, item.id))}</div>`;
      choices = `<ul class="cs-test__choices" role="list">
        ${item.options
          .map(
            (opt) => `
          <li>
            <button type="button" class="cs-test__choice" data-choice="${escapeAttr(opt.id)}"
              aria-pressed="${selected === opt.id ? 'true' : 'false'}">${escapeHtml(opt.label)}</button>
          </li>`,
          )
          .join('')}
      </ul>`;
    }

    const isFirst = index === 0;
    const isLast = index === ITEMS.length - 1;
    const nextLabel = isLast ? 'See results' : 'Next';
    const canNext = selected !== null && selected !== undefined;

    return `
      <p class="cs-test__progress" aria-live="polite">Step ${step} of ${TOTAL_STEPS}</p>
      <h2 class="cs-test__heading" id="cs-test-heading">${escapeHtml(item.prompt)}</h2>
      ${stimulus}
      ${choices}
      <div class="cs-test__nav">
        <button type="button" data-action="back" ${isFirst ? 'disabled' : ''}>Back</button>
        <button type="button" class="cs-test__primary" data-action="next" ${canNext ? '' : 'disabled aria-describedby="cs-test-answer-hint"'}>${nextLabel}</button>
      </div>
      ${canNext ? '' : '<p class="cs-test__hint" id="cs-test-answer-hint">Choose an answer to continue</p>'}
    `;
  }

  /**
   * @param {import('./items.js').TestItem} item
   */
  bindItem(item) {
    this.root.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = /** @type {HTMLElement} */ (btn).dataset.choice ?? null;
        this.choices[item.id] = choice;
        this.render({ focusHeading: false });
        // Keep focus on the selected control after re-render
        const again = this.root.querySelector(`[data-choice="${CSS.escape(String(choice))}"]`);
        if (again instanceof HTMLElement) again.focus();
      });
    });
    this.root.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      if (this.index > 0) {
        this.index -= 1;
        this.render({ focusHeading: true });
      }
    });
    this.root.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      if (this.choices[item.id] == null) return;
      if (this.index < ITEMS.length - 1) {
        this.index += 1;
        this.render({ focusHeading: true });
      } else {
        this.finish();
      }
    });
  }

  finish() {
    const raw = ITEMS.map((it) => ({
      itemId: it.id,
      choice: this.choices[it.id] ?? null,
    }));
    this.result = scoreAnswers(raw, scoreableItems());
    commitResult(this.result);
    this.phase = 'result';
    this.render({ focusHeading: true });
  }

  /**
   * @param {ColourVisionResult} result
   */
  resultHtml(result) {
    const { headline, detail } = summariseResult(result);
    return `
      <p class="cs-test__progress">Results</p>
      <h2 class="cs-test__heading" id="cs-test-heading">${escapeHtml(headline)}</h2>
      <p class="cs-test__lead">${escapeHtml(detail)} Preview and camera now correct for this. Change it in <a href="#settings">Settings</a>.</p>
      <ul class="cs-test__result-scores">
        <li>Protan error rate: ${Math.round(result.scores.protan * 100)}%</li>
        <li>Deutan error rate: ${Math.round(result.scores.deutan * 100)}%</li>
        <li>Tritan error rate: ${Math.round(result.scores.tritan * 100)}%</li>
        <li>Controls correct: ${result.controlCorrect} / ${result.controlTotal}</li>
      </ul>
      <p class="cs-test__disclaimer"><strong>Screening only — not a diagnosis.</strong> Colour vision varies with lighting, display calibration and fatigue. See an optometrist or ophthalmologist for a clinical assessment.</p>
      <div class="cs-test__nav">
        <button type="button" data-action="retake">Retake test</button>
        <a class="button button--secondary" href="live/">Open live camera</a>
        <a class="button" href="#preview">See your colours corrected</a>
      </div>
    `;
  }

  bindResult() {
    this.root.querySelector('[data-action="retake"]')?.addEventListener('click', () => this.start());
  }
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {string} s */
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function boot() {
  if (typeof document === 'undefined') return; // imported by node --test
  const root = mountRoot();
  if (!root) return;
  // Clear the stub copy inside #view-test except our root / keep heading structure tidy
  const section = document.getElementById('view-test');
  if (section) {
    section.querySelectorAll(':scope > :not(#colour-test-root)').forEach((el) => {
      // Keep the section's accessible name: leave the h1, remove the stub paragraph
      if (el.tagName === 'H1') return;
      el.remove();
    });
  }
  // eslint-disable-next-line no-new
  new ColourVisionTest(root);
}

boot();
