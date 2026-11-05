/**
 * Webcam → canvas capture (no colour correction).
 * Plug into the ColourSight camera view later via createCamera().
 */

const DEFAULT_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

/**
 * Map getUserMedia / context failures to clear, actionable copy.
 * @param {unknown} err
 * @returns {string}
 */
export function describeCameraError(err) {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera needs a secure context. Open this page over HTTPS or on localhost.';
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'This browser cannot access the camera from this page. Try Chrome or Firefox on desktop over HTTPS or localhost.';
  }

  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Camera permission was denied. Allow the camera for this site in your browser settings, then press Start again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found. Plug in a webcam or enable the built-in camera, then try again.';
    case 'OverconstrainedError':
      return 'No camera matched the requested settings. Try again with a different device.';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'The camera is already in use by another app or tab. Close it, then try again.';
    default:
      return err && typeof err === 'object' && 'message' in err && err.message
        ? String(err.message)
        : 'Could not start the camera. Check permissions and try again.';
  }
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   video?: HTMLVideoElement,
 *   onState?: (state: 'idle'|'starting'|'running'|'stopping') => void,
 *   onError?: (message: string) => void,
 *   constraints?: MediaStreamConstraints,
 * }} options
 */
export function createCamera(options) {
  const canvas = options.canvas;
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError('createCamera requires a canvas element');
  }

  const video =
    options.video instanceof HTMLVideoElement
      ? options.video
      : Object.assign(document.createElement('video'), {
          muted: true,
          playsInline: true,
          autoplay: true,
        });
  video.setAttribute('playsinline', '');
  video.muted = true;

  const constraints = options.constraints ?? DEFAULT_CONSTRAINTS;
  const ctx = canvas.getContext('2d', { alpha: false });

  let stream = null;
  let rafId = 0;
  let state = 'idle';
  let startToken = 0;

  function setState(next) {
    state = next;
    options.onState?.(next);
  }

  function drawFrame() {
    if (!stream) return;
    const { videoWidth: w, videoHeight: h } = video;
    if (w > 0 && h > 0) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(video, 0, 0, w, h);
    }
    rafId = requestAnimationFrame(drawFrame);
  }

  function clearCanvas() {
    if (canvas.width && canvas.height) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async function start() {
    if (state === 'running' || state === 'starting') return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      const message = describeCameraError(new Error('insecure'));
      options.onError?.(message);
      throw new Error(message);
    }

    const token = ++startToken;
    setState('starting');

    try {
      const media = await navigator.mediaDevices.getUserMedia(constraints);
      if (token !== startToken) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = media;
      video.srcObject = media;
      await video.play();
      if (token !== startToken) {
        stopTracks();
        return;
      }
      setState('running');
      rafId = requestAnimationFrame(drawFrame);
    } catch (err) {
      if (token !== startToken) return;
      stopTracks();
      setState('idle');
      const message = describeCameraError(err);
      options.onError?.(message);
      throw Object.assign(err instanceof Error ? err : new Error(message), {
        userMessage: message,
      });
    }
  }

  function stopTracks() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.srcObject = null;
    clearCanvas();
  }

  function stop() {
    startToken += 1;
    if (state === 'idle') return;
    setState('stopping');
    stopTracks();
    setState('idle');
  }

  return {
    start,
    stop,
    isRunning: () => state === 'running',
    getCanvas: () => canvas,
    getVideo: () => video,
  };
}
