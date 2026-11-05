/**
 * ColourSight multi-step colour-vision screening UI.
 * Self-mounts into #colour-test-root (or #view-test) when this module loads.
 */

import { ITEMS, scoreableItems } from './items.js';
import { scoreAnswers, summariseResult } from './scoring.js';
import { commitResult, loadResult, RESULT_STORAGE_KEY } from './result.js';

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
 * Build a simple SVG digit plate from coloured dots (original artwork, not Ishihara).
 * @param {{ digit: string, figure: string, ground: string }} item
 */
function plateSvg(item) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const dots = [];
  // Ground dots in a disk
  for (let i = 0; i < 90; i += 1) {
    const a = (i * 137.5 * Math.PI) / 180;
    const r = 18 + (i % 7) * 10;
    if (r > 95) continue;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const rad = 5 + (i % 3);
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${item.ground}"/>`);
  }
  // Figure dots roughly forming the digit via a hidden text mask approach:
  // sample points inside a path approximated by placing dots on digit strokes.
  const figurePoints = digitPoints(item.digit, cx, cy);
  figurePoints.forEach((p, i) => {
    const rad = 6 + (i % 3);
    dots.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rad}" fill="${item.figure}"/>`);
  });

  return `<svg class="cs-test__plate" viewBox="0 0 ${size} ${size}" role="img" aria-label="Colour plate — try to read the digit">
    <circle cx="${cx}" cy="${cy}" r="108" fill="#222"/>
    ${dots.join('\n    ')}
  </svg>`;
}

/**
 * Approximate stroke samples for digits 2,5,6 (enough for this bank).
 * @param {string} digit
 * @param {number} cx
 * @param {number} cy
 */
function digitPoints(digit, cx, cy) {
  /** @type {{x:number,y:number}[]} */
  const pts = [];
  const add = (x, y) => pts.push({ x: cx + x, y: cy + y });

  if (digit === '5') {
    for (let x = -30; x <= 30; x += 8) add(x, -40);
    for (let y = -40; y <= -5; y += 8) add(-30, y);
    for (let x = -30; x <= 25; x += 8) add(x, -5);
    for (let y = -5; y <= 40; y += 8) add(25, y);
    for (let x = 25; x >= -30; x -= 8) add(x, 40);
  } else if (digit === '2') {
    for (let x = -28; x <= 28; x += 8) add(x, -40);
    for (let y = -40; y <= -5; y += 8) add(28, y);
    for (let x = 28; x >= -28; x -= 8) add(x, -5);
    for (let y = -5; y <= 40; y += 8) add(-28, y);
    for (let x = -28; x <= 28; x += 8) add(x, 40);
  } else if (digit === '6') {
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      add(Math.cos(a) * 28, 10 + Math.sin(a) * 28);
    }
    for (let y = -40; y <= 10; y += 8) add(-28, y);
    for (let x = -28; x <= 20; x += 8) add(x, -40);
  } else {
    // Fallback: vertical bar
    for (let y = -40; y <= 40; y += 8) add(0, y);
  }
  return pts;
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
      <p class="cs-test__lead">You will see ${TOTAL_STEPS} short steps. Some ask you to pick the odd swatch out; others ask which digit you can read in a dotted circle. Take your time, and use the best guess if unsure.</p>
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
            </button>
          </li>`,
          )
          .join('')}
      </ul>`;
    } else {
      stimulus = `<div class="cs-test__plate-wrap">${plateSvg(item)}</div>`;
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
        <button type="button" class="cs-test__primary" data-action="next" ${canNext ? '' : 'disabled'}>${nextLabel}</button>
      </div>
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
      <p class="cs-test__lead">${escapeHtml(detail)}</p>
      <ul class="cs-test__result-scores">
        <li>Protan error rate: ${Math.round(result.scores.protan * 100)}%</li>
        <li>Deutan error rate: ${Math.round(result.scores.deutan * 100)}%</li>
        <li>Tritan error rate: ${Math.round(result.scores.tritan * 100)}%</li>
        <li>Controls correct: ${result.controlCorrect} / ${result.controlTotal}</li>
      </ul>
      <p class="cs-test__disclaimer"><strong>Screening only — not a diagnosis.</strong> Colour vision varies with lighting, display calibration and fatigue. See an optometrist or ophthalmologist for a clinical assessment. Your result is saved locally as <code>${RESULT_STORAGE_KEY}</code> for the camera tools.</p>
      <div class="cs-test__nav">
        <button type="button" data-action="retake">Retake test</button>
        <a class="button cs-test__primary" href="#camera" style="display:inline-block">Go to camera</a>
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
