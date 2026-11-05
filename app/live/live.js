import { createCamera } from '../camera/camera.js';
import { correctImageData } from '../correct/correct.js';
import { getProfile, subscribe } from '../profile/profile.js';
import { profileToCorrector } from './mapping.js';

export { profileToCorrector };

/**
 * Mount the live camera correction UI into root.
 * @param {HTMLElement} root
 * @returns {{ destroy: () => void }}
 */
export function mountLive(root) {
  root.classList.add('cs-live');
  root.innerHTML = `
    <div class="cs-live__controls">
      <button type="button" class="cs-live__start">Start camera</button>
      <div class="cs-live__toggle" role="group" aria-label="View mode">
        <button type="button" data-mode="original" aria-pressed="false">Original</button>
        <button type="button" data-mode="corrected" aria-pressed="true">Corrected</button>
      </div>
    </div>
    <p class="cs-live__profile" aria-live="polite"></p>
    <p class="cs-live__notice" id="cs-live-notice" hidden>No colour profile yet → <a href="../#test">Take the test</a>. Corrected view stays off until you have a profile.</p>
    <p class="cs-live__error" role="alert" hidden><span class="cs-live__error-prefix">Camera problem:</span> <span class="cs-live__error-text"></span></p>
    <div class="cs-live__stage">
      <canvas class="cs-live__display" aria-label="Live camera feed"></canvas>
      <p class="cs-live__idle">Press Start camera; your browser will ask for permission. Video stays on this device.</p>
    </div>
    <p class="cs-live__disclaimer">This is assistive colour remapping to help tell colours apart. It does not restore normal colour vision and is not a medical device.</p>
  `;

  const startBtn = root.querySelector('.cs-live__start');
  const modeBtns = root.querySelectorAll('[data-mode]');
  const profileEl = root.querySelector('.cs-live__profile');
  const noticeEl = root.querySelector('.cs-live__notice');
  const errorEl = root.querySelector('.cs-live__error');
  const errorTextEl = root.querySelector('.cs-live__error-text');
  const stageEl = root.querySelector('.cs-live__stage');
  const idleEl = root.querySelector('.cs-live__idle');
  const display = root.querySelector('.cs-live__display');
  const dctx = display.getContext('2d');
  const source = document.createElement('canvas');
  const sctx = source.getContext('2d', { willReadFrequently: true });

  let mode = 'corrected';
  let profile = getProfile();
  let corrector = profileToCorrector(profile);
  let rafId = 0;

  function setMode(next) {
    mode = next;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  }

  function renderProfile() {
    const missing = !profile || profile.source === 'default';
    const correctedBtn = root.querySelector('[data-mode="corrected"]');
    noticeEl.hidden = !missing;
    profileEl.hidden = missing;
    if (correctedBtn) {
      correctedBtn.disabled = missing;
      if (missing) correctedBtn.setAttribute('aria-describedby', 'cs-live-notice');
      else correctedBtn.removeAttribute('aria-describedby');
    }
    if (missing) {
      if (mode === 'corrected') setMode('original');
      return;
    }
    const label = profile.severityLabel && profile.severityLabel !== 'none'
      ? ` (${profile.severityLabel})`
      : '';
    profileEl.textContent = `Profile: ${profile.type || 'normal'}${label}` +
      (corrector.type === 'normal' ? ' — no correction applied' : '');
  }

  function showError(msg) {
    errorTextEl.textContent = msg || '';
    errorEl.hidden = !msg;
  }

  const camera = createCamera({
    canvas: source,
    onState: (s) => {
      startBtn.textContent = s === 'running' ? 'Stop camera' : s === 'starting' ? 'Starting…' : 'Start camera';
      startBtn.disabled = s === 'starting';
      const running = s === 'running';
      stageEl.classList.toggle('is-running', running);
      idleEl.hidden = running;
    },
    onError: showError,
  });

  function frame() {
    const { width: w, height: h } = source;
    if (w && h) {
      if (display.width !== w || display.height !== h) {
        display.width = w;
        display.height = h;
      }
      if (mode === 'corrected' && corrector.type !== 'normal') {
        const img = sctx.getImageData(0, 0, w, h);
        const out = correctImageData(img, corrector) || img;
        dctx.putImageData(out, 0, 0);
      } else {
        dctx.drawImage(source, 0, 0);
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  startBtn.addEventListener('click', async () => {
    if (camera.isRunning()) {
      camera.stop();
      stopLoop();
      return;
    }
    showError('');
    try {
      await camera.start();
      if (camera.isRunning() && !rafId) rafId = requestAnimationFrame(frame);
    } catch {
      // error surfaced via onError
    }
  });

  modeBtns.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      setMode(btn.dataset.mode);
    }),
  );

  const unsubscribe = subscribe(() => {
    profile = getProfile();
    corrector = profileToCorrector(profile);
    renderProfile();
  });
  renderProfile();

  return {
    destroy() {
      camera.stop();
      stopLoop();
      if (typeof unsubscribe === 'function') unsubscribe();
    },
  };
}

if (typeof document !== 'undefined') {
  const auto = document.getElementById('live-root');
  if (auto) mountLive(auto);
}
