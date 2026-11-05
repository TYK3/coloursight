/**
 * Static image correction preview.
 * Before/after canvases driven by the saved ColourProfile and correctImageData.
 * Assistive colour remapping only, not a medical treatment.
 * @module
 */

import { getProfile, subscribe } from '../profile/profile.js';
import { correctImageData } from '../correct/correct.js';

const SAMPLE_W = 320;
const SAMPLE_H = 240;

/**
 * Map a ColourProfile to the shape expected by the corrector.
 * Severity drives remapping strength; normal → no correction.
 * @param {{ type?: string, severity?: number, confidence?: number }|null|undefined} profile
 * @returns {{ type: string, confidence: number }}
 */
export function profileToCorrector(profile) {
  if (!profile || typeof profile !== 'object') {
    return { type: 'normal', confidence: 0 };
  }
  const type = typeof profile.type === 'string' ? profile.type : 'normal';
  if (type === 'normal') {
    return { type: 'normal', confidence: 0 };
  }
  const confidence =
    typeof profile.severity === 'number'
      ? profile.severity
      : typeof profile.confidence === 'number'
        ? profile.confidence
        : 0;
  return { type, confidence };
}

/**
 * Call `refresh` whenever the Preview route is shown, so the view never keeps
 * a profile that went stale while it was hidden (e.g. after finishing the test).
 * @param {{ location: { hash: string }, addEventListener: Function, removeEventListener: Function }} win
 * @param {() => void} refresh
 * @returns {() => void} unbind
 */
export function refreshOnPreviewRoute(win, refresh) {
  const onRoute = () => {
    if (win.location.hash === '#preview') refresh();
  };
  win.addEventListener('hashchange', onRoute);
  return () => win.removeEventListener('hashchange', onRoute);
}

/**
 * Draw a colourful sample scene onto a 2d canvas context (fixed SAMPLE_W x SAMPLE_H).
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawSampleScene(ctx) {
  const w = SAMPLE_W;
  const h = SAMPLE_H;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, w, 0);
  ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].forEach((c, i, a) => {
    g.addColorStop(i / (a.length - 1), c);
  });
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 56);

  // Traffic-light style column (red/amber/green — CVD-sensitive).
  ctx.fillStyle = '#222';
  ctx.fillRect(20, 72, 60, 150);
  ['#d32f2f', '#ffb300', '#2e7d32'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(50, 97 + i * 50, 20, 0, Math.PI * 2);
    ctx.fill();
  });

  // Fruit / flower dots across red–green–blue hues.
  /** @type {[string, number, number][]} */
  const dots = [
    ['#c62828', 130, 110],
    ['#7cb342', 190, 110],
    ['#ef6c00', 250, 110],
    ['#558b2f', 130, 180],
    ['#ad1457', 190, 180],
    ['#f9a825', 250, 180],
  ];
  dots.forEach(([c, x, y]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Mount the static correction preview UI into `root`.
 * @param {HTMLElement} root
 * @returns {{ destroy: () => void }}
 */
export function mountPreview(root) {
  if (!root) {
    throw new TypeError('mountPreview requires a root element');
  }

  root.classList.add('cs-preview');
  root.innerHTML = `
    <p class="cs-preview__lead">
      Compare an original still with the assistive remapping for your saved colour profile.
    </p>
    <p class="cs-preview__disclaimer" role="note">
      Assistive colour remapping only — not a medical treatment or diagnosis.
    </p>
    <div class="cs-preview__profile" aria-live="polite">
      <span class="cs-preview__profile-label">Active profile:</span>
      <span class="cs-preview__profile-value" data-el="profile-summary">—</span>
    </div>
    <div class="cs-preview__toolbar">
      <button type="button" class="cs-preview__btn" data-el="sample-btn">Load sample scene</button>
      <button type="button" class="cs-preview__btn" data-el="upload-btn">Upload your own photo…</button>
      <button type="button" class="cs-preview__btn" data-el="apply-btn">Re-apply</button>
    </div>
    <input type="file" accept="image/*" data-el="file-input" class="cs-preview__file-input" tabindex="-1" aria-hidden="true" />
    <p class="cs-preview__status" data-el="status" aria-live="polite"></p>
    <div class="cs-preview__pair">
      <figure class="cs-preview__figure">
        <canvas data-el="before" width="${SAMPLE_W}" height="${SAMPLE_H}" aria-label="Original image"></canvas>
        <figcaption>Before</figcaption>
      </figure>
      <figure class="cs-preview__figure">
        <canvas data-el="after" width="${SAMPLE_W}" height="${SAMPLE_H}" aria-label="Corrected image"></canvas>
        <figcaption>After</figcaption>
      </figure>
    </div>
  `;

  /** @type {(sel: string) => HTMLElement} */
  const el = (sel) => {
    const node = root.querySelector(`[data-el="${sel}"]`);
    if (!node) throw new Error(`missing [data-el="${sel}"]`);
    return /** @type {HTMLElement} */ (node);
  };

  const beforeCanvas = /** @type {HTMLCanvasElement} */ (el('before'));
  const afterCanvas = /** @type {HTMLCanvasElement} */ (el('after'));
  const beforeCtx = beforeCanvas.getContext('2d', { willReadFrequently: true });
  const afterCtx = afterCanvas.getContext('2d');
  if (!beforeCtx || !afterCtx) {
    throw new Error('2d canvas context unavailable');
  }

  const summaryEl = el('profile-summary');
  const statusEl = el('status');
  const sampleBtn = /** @type {HTMLButtonElement} */ (el('sample-btn'));
  const uploadBtn = /** @type {HTMLButtonElement} */ (el('upload-btn'));
  const applyBtn = /** @type {HTMLButtonElement} */ (el('apply-btn'));
  const fileInput = /** @type {HTMLInputElement} */ (el('file-input'));

  /** @type {string|null} */
  let objectUrl = null;

  function setStatus(message) {
    statusEl.textContent = message || '';
  }

  const TYPE_WORDS = {
    protan: 'Protan',
    deutan: 'Deutan',
    tritan: 'Tritan',
    normal: 'Normal',
  };

  function formatProfile(profile) {
    if (!profile || profile.source === 'default' || !profile.type) {
      return 'No colour profile yet';
    }
    const type = TYPE_WORDS[profile.type] || profile.type;
    const from = profile.source === 'test'
      ? 'from your test'
      : profile.source === 'manual'
        ? 'from your settings'
        : 'saved on this device';
    if (profile.type === 'normal') return `${type}, ${from}`;
    const strength = profile.severityLabel && profile.severityLabel !== 'none'
      ? profile.severityLabel
      : 'mild';
    return `${type}, ${strength}, ${from}`;
  }

  function resizeCanvases(w, h) {
    beforeCanvas.width = w;
    beforeCanvas.height = h;
    afterCanvas.width = w;
    afterCanvas.height = h;
  }

  function applyCorrection(lead) {
    const profile = getProfile();
    summaryEl.textContent = formatProfile(profile);
    const mapped = profileToCorrector(profile);
    const src = beforeCtx.getImageData(0, 0, beforeCanvas.width, beforeCanvas.height);
    const out = correctImageData(src, mapped);
    afterCtx.putImageData(out, 0, 0);
    const strength = mapped.confidence;
    const applied = mapped.type === 'normal' || strength === 0
      ? 'No remapping applied (normal profile or zero strength).'
      : `Applied ${mapped.type} remapping at strength ${Number(strength).toFixed(2)}.`;
    setStatus(lead ? `${lead} ${applied}` : applied);
  }

  function loadSample() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    fileInput.value = '';
    resizeCanvases(SAMPLE_W, SAMPLE_H);
    drawSampleScene(beforeCtx);
    applyCorrection('Sample scene loaded.');
  }

  /**
   * @param {File} file
   */
  function loadFile(file) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    const url = URL.createObjectURL(file);
    objectUrl = url;
    const img = new Image();
    img.onload = () => {
      const maxW = 640;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      resizeCanvases(w, h);
      beforeCtx.drawImage(img, 0, 0, w, h);
      applyCorrection(`Loaded “${file.name}” (${w}×${h}).`);
    };
    img.onerror = () => {
      setStatus('Could not load that image. Try another file.');
      if (objectUrl === url) {
        URL.revokeObjectURL(url);
        objectUrl = null;
      }
    };
    img.src = url;
  }

  sampleBtn.addEventListener('click', loadSample);
  uploadBtn.addEventListener('click', () => fileInput.click());
  applyBtn.addEventListener('click', () => {
    applyCorrection();
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) loadFile(file);
  });

  const unsubscribe = subscribe(() => {
    applyCorrection();
  });

  loadSample();

  return {
    /** Re-read the active profile and redraw the After image. */
    refresh() {
      applyCorrection();
    },
    destroy() {
      unsubscribe();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      root.innerHTML = '';
      root.classList.remove('cs-preview');
    },
  };
}

// Auto-mount when a dedicated root is present (shell or standalone page).
const autoRoot =
  typeof document !== 'undefined'
    ? document.getElementById('preview-root') || document.getElementById('cs-preview-root')
    : null;
if (autoRoot) {
  const view = mountPreview(autoRoot);
  refreshOnPreviewRoute(window, () => view.refresh());
}
