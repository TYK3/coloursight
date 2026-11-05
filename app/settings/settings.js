/**
 * ColourSight settings UI — type and intensity for the personalised profile.
 * Self-mounts into #settings-root (or #view-settings) when this module loads.
 */

import {
  RESULT_STORAGE_KEY,
  clearProfile,
  getProfile,
  setProfile,
  subscribe,
} from '../profile/profile.js';
import {
  formStateFromProfile,
  formatUpdatedAt,
  profilePayloadFromForm,
  severityToSlider,
  sliderToSeverity,
  sourceLabel,
} from './state.js';

/** @typedef {import('../profile/profile.js').ColourProfile} ColourProfile */
/** @typedef {import('../profile/profile.js').ColourVisionType} ColourVisionType */

const TYPE_OPTIONS = [
  { value: 'protan', label: 'Protan (red-weak)' },
  { value: 'deutan', label: 'Deutan (green-weak)' },
  { value: 'tritan', label: 'Tritan (blue-weak)' },
  { value: 'normal', label: 'Normal / off' },
];

/**
 * @returns {HTMLElement|null}
 */
function resolveMountTarget() {
  const dedicated = document.getElementById('settings-root');
  if (dedicated) return dedicated;
  return document.getElementById('view-settings');
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @returns {boolean}
 */
function hasTestResult() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(RESULT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && typeof parsed === 'object' && 'type' in parsed);
  } catch {
    return false;
  }
}

/**
 * Mount the settings UI into an element.
 * @param {HTMLElement} el
 * @returns {{ destroy: () => void }}
 */
export function mountSettings(el) {
  if (!(el instanceof HTMLElement)) {
    throw new TypeError('mountSettings requires an HTMLElement');
  }

  el.classList.add('cs-settings');
  /** @type {ColourProfile} */
  let current = getProfile();
  /** @type {ColourVisionType} */
  let draftType = current.type;
  let draftPercent = severityToSlider(current.type === 'normal' ? 0 : current.severity);
  let suppressExternal = false;

  const unsubscribe = subscribe((profile) => {
    if (suppressExternal) return;
    current = profile;
    draftType = profile.type;
    draftPercent = severityToSlider(profile.type === 'normal' ? 0 : profile.severity);
    render();
  });

  function announce(message) {
    const status = el.querySelector('[data-role="status"]');
    if (status) status.textContent = message;
  }

  function saveManual() {
    const payload = profilePayloadFromForm({
      type: draftType,
      intensityPercent: draftPercent,
      confidence: current.confidence > 0 ? current.confidence : 1,
    });
    suppressExternal = true;
    try {
      current = setProfile(payload);
      draftType = current.type;
      draftPercent = severityToSlider(current.type === 'normal' ? 0 : current.severity);
    } finally {
      suppressExternal = false;
    }
    render();
    announce('Profile saved.');
  }

  function resetToTest() {
    if (!hasTestResult()) {
      announce('No test result is stored on this device.');
      return;
    }
    suppressExternal = true;
    try {
      clearProfile();
      current = getProfile();
      draftType = current.type;
      draftPercent = severityToSlider(current.type === 'normal' ? 0 : current.severity);
    } finally {
      suppressExternal = false;
    }
    render();
    announce('Reset to your test-derived profile.');
  }

  function clearEverything() {
    const ok = window.confirm(
      'Clear everything? This removes your saved profile and any colour-vision test result stored on this device. This cannot be undone.',
    );
    if (!ok) {
      announce('Clear cancelled.');
      return;
    }
    suppressExternal = true;
    try {
      try {
        localStorage.removeItem(RESULT_STORAGE_KEY);
      } catch {
        // ignore storage failures
      }
      clearProfile();
      current = getProfile();
      draftType = current.type;
      draftPercent = severityToSlider(current.type === 'normal' ? 0 : current.severity);
    } finally {
      suppressExternal = false;
    }
    render();
    announce('All stored profile and test data cleared.');
  }

  function render() {
    const form = formStateFromProfile({
      ...current,
      type: draftType,
      severity: draftType === 'normal' ? 0 : sliderToSeverity(draftPercent),
    });
    const intensityDisabled = draftType === 'normal';
    const testAvailable = hasTestResult();
    const percent = intensityDisabled ? 0 : draftPercent;
    const severity = intensityDisabled ? 0 : sliderToSeverity(percent);
    const label = form.severityLabel;

    const radios = TYPE_OPTIONS.map((opt) => {
      const checked = draftType === opt.value ? 'checked' : '';
      const id = `cs-settings-type-${opt.value}`;
      return `
        <div class="cs-settings__radio">
          <input type="radio" name="cs-settings-type" id="${id}"
            value="${escapeHtml(opt.value)}" ${checked}>
          <label for="${id}">${escapeHtml(opt.label)}</label>
        </div>`;
    }).join('');

    el.innerHTML = `
      <form class="cs-settings__form" data-role="form" novalidate>
        <fieldset class="cs-settings__fieldset">
          <legend>Colour-vision type</legend>
          <p class="cs-settings__hint">Choose the type that matches how you see colour, or turn correction off.</p>
          <div class="cs-settings__radios" role="presentation">
            ${radios}
          </div>
        </fieldset>

        <div class="cs-settings__field">
          <label class="cs-settings__label" for="cs-settings-intensity">
            Correction intensity
          </label>
          <p class="cs-settings__hint" id="cs-settings-intensity-hint">
            0% is off; 100% is full strength for the selected type.
          </p>
          <div class="cs-settings__slider-row">
            <input type="range" id="cs-settings-intensity" name="intensity"
              min="0" max="100" step="1" value="${percent}"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"
              aria-valuetext="${percent} percent, ${escapeHtml(label)}"
              aria-describedby="cs-settings-intensity-hint cs-settings-intensity-readout"
              ${intensityDisabled ? 'disabled' : ''}>
            <p class="cs-settings__readout" id="cs-settings-intensity-readout"
              aria-live="polite">
              <span data-role="percent">${percent}</span>% —
              severity <span data-role="severity">${severity.toFixed(2)}</span>
              (<span data-role="severity-label">${escapeHtml(label)}</span>)
            </p>
          </div>
        </div>

        <div class="cs-settings__meta" data-role="meta">
          <p>
            <strong>Source:</strong>
            <span data-role="source">${escapeHtml(sourceLabel(current.source))}</span>
          </p>
          <p>
            <strong>Last updated:</strong>
            <time data-role="updated" datetime="${escapeHtml(current.updatedAt)}">${escapeHtml(formatUpdatedAt(current.updatedAt))}</time>
          </p>
        </div>

        <div class="cs-settings__actions">
          <button type="submit" class="cs-settings__primary" data-action="save">Save profile</button>
          <button type="button" data-action="reset-test" ${testAvailable ? '' : 'disabled'}
            title="${testAvailable ? 'Restore the profile derived from your screening test' : 'No test result stored'}">
            Reset to test result
          </button>
          <button type="button" class="cs-settings__danger" data-action="clear-all">
            Clear everything…
          </button>
        </div>
      </form>
      <p class="cs-settings__status" data-role="status" role="status" aria-live="polite"></p>
    `;

    bind();
  }

  function bind() {
    const formEl = el.querySelector('[data-role="form"]');
    formEl?.addEventListener('submit', (event) => {
      event.preventDefault();
      saveManual();
    });

    el.querySelectorAll('input[name="cs-settings-type"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!(input instanceof HTMLInputElement) || !input.checked) return;
        const value = input.value;
        draftType = /** @type {ColourVisionType} */ (value);
        if (draftType === 'normal') draftPercent = 0;
        // Re-render so intensity disabled state and readout stay in sync
        const statusBefore = el.querySelector('[data-role="status"]')?.textContent ?? '';
        render();
        if (statusBefore) announce(statusBefore);
        const again = el.querySelector(
          `input[name="cs-settings-type"][value="${CSS.escape(value)}"]`,
        );
        if (again instanceof HTMLElement) again.focus();
      });
    });

    const slider = el.querySelector('#cs-settings-intensity');
    slider?.addEventListener('input', () => {
      if (!(slider instanceof HTMLInputElement)) return;
      draftPercent = Number(slider.value);
      slider.setAttribute('aria-valuenow', String(draftPercent));
      const severity = sliderToSeverity(draftPercent);
      const form = formStateFromProfile({
        ...current,
        type: draftType,
        severity,
      });
      slider.setAttribute(
        'aria-valuetext',
        `${draftPercent} percent, ${form.severityLabel}`,
      );
      const percentEl = el.querySelector('[data-role="percent"]');
      const severityEl = el.querySelector('[data-role="severity"]');
      const labelEl = el.querySelector('[data-role="severity-label"]');
      if (percentEl) percentEl.textContent = String(draftPercent);
      if (severityEl) severityEl.textContent = severity.toFixed(2);
      if (labelEl) labelEl.textContent = form.severityLabel;
    });

    el.querySelector('[data-action="reset-test"]')?.addEventListener('click', () => {
      resetToTest();
    });
    el.querySelector('[data-action="clear-all"]')?.addEventListener('click', () => {
      clearEverything();
    });
  }

  // Tidy stub copy inside #view-settings when we own that section
  const section = document.getElementById('view-settings');
  if (section && (el === section || section.contains(el))) {
    section.querySelectorAll(':scope > :not(#settings-root)').forEach((child) => {
      if (child.tagName === 'H1') return;
      if (child === el) return;
      child.remove();
    });
  }

  render();

  return {
    destroy() {
      unsubscribe();
      el.replaceChildren();
      el.classList.remove('cs-settings');
    },
  };
}

function boot() {
  const root = resolveMountTarget();
  if (!root) return;
  mountSettings(root);
}

boot();
