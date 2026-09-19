// Orquestra o ciclo de vida da sessão: reset completo, finalização e a
// ligação do timer de inatividade ao reset. app.js injeta a função de
// navegação (goToScreen) via configureSession para evitar import circular.

import { session, clearOriginalPhoto, clearGeneratedImage, setGenerating, setSelectedColor } from './state.js';
import { stopCamera } from './camera.js';
import {
  initInactivityWatcher,
  pauseInactivityTimer,
  resumeInactivityTimer,
} from './inactivity.js';
import { trackEvent } from './analytics.js';

let goToScreen = () => {};
let onInactivityWarning = () => {};
let onInactivityWarningHide = () => {};
let onInactivityTick = () => {};

export function configureSession(hooks) {
  goToScreen = hooks.goToScreen || goToScreen;
  onInactivityWarning = hooks.onInactivityWarning || onInactivityWarning;
  onInactivityWarningHide = hooks.onInactivityWarningHide || onInactivityWarningHide;
  onInactivityTick = hooks.onInactivityTick || onInactivityTick;
}

/**
 * Reset completo da experiência: câmera, fotos, tonalidade, timers, modais.
 * Deve ser seguro chamar a qualquer momento, de qualquer tela.
 */
export function resetSession({ trackTimeout = false } = {}) {
  stopCamera();
  clearOriginalPhoto();
  clearGeneratedImage();
  setSelectedColor(null);
  setGenerating(false);

  document.body.classList.remove('modal-aberto');

  if (trackTimeout) trackEvent('session_timeout');

  goToScreen('home');
  resumeInactivityTimer();
}

/** Fluxo de "Finalizar": tela de agradecimento breve e depois reset total. */
export function finishSession() {
  trackEvent('session_finished');
  goToScreen('obrigado');
  pauseInactivityTimer();

  window.setTimeout(() => {
    resetSession();
  }, 2200);
}

export function beginGenerating() {
  setGenerating(true);
  pauseInactivityTimer();
}

export function endGenerating() {
  setGenerating(false);
  resumeInactivityTimer();
}

export function startSessionWatchers() {
  trackEvent('session_started');
  initInactivityWatcher({
    onTick: (remaining) => onInactivityTick(remaining),
    onWarningShow: (remaining) => onInactivityWarning(remaining),
    onWarningHide: () => onInactivityWarningHide(),
    onTimeout: () => resetSession({ trackTimeout: true }),
  });
}

export { session };
