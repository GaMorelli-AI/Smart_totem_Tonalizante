// Timer de inatividade do totem.
//
// Regras (obrigatórias):
// - 30s sem interação -> reset completo da experiência.
// - Faltando 5s, mostra aviso com contagem regressiva.
// - Enquanto session.generating === true, o timer fica pausado.

const TOTAL_SECONDS = 30;
const WARNING_SECONDS = 5;
const ACTIVITY_EVENTS = ['pointerdown', 'touchstart', 'click', 'keydown'];

let tickHandle = null;
let remaining = TOTAL_SECONDS;
let warningVisible = false;
let paused = false;
let callbacks = { onTick: () => {}, onWarningShow: () => {}, onWarningHide: () => {}, onTimeout: () => {} };
let started = false;

function tick() {
  if (paused) return;

  remaining -= 1;
  callbacks.onTick(remaining);

  if (remaining <= WARNING_SECONDS && !warningVisible) {
    warningVisible = true;
    callbacks.onWarningShow(remaining);
  }

  if (remaining <= 0) {
    stopInterval();
    callbacks.onTimeout();
    return;
  }
}

function startInterval() {
  stopInterval();
  tickHandle = window.setInterval(tick, 1000);
}

function stopInterval() {
  if (tickHandle) {
    window.clearInterval(tickHandle);
    tickHandle = null;
  }
}

/** Reinicia a contagem para 30s e esconde o aviso, se visível. */
export function resetInactivityTimer() {
  remaining = TOTAL_SECONDS;
  if (warningVisible) {
    warningVisible = false;
    callbacks.onWarningHide();
  }
  if (!paused) startInterval();
}

/** Pausa o timer (usado durante a geração da IA). */
export function pauseInactivityTimer() {
  paused = true;
  stopInterval();
}

/** Retoma o timer, reiniciando a contagem completa de 30s. */
export function resumeInactivityTimer() {
  paused = false;
  resetInactivityTimer();
}

function handleActivity() {
  if (paused) return;
  resetInactivityTimer();
}

/**
 * Inicializa o watcher de inatividade.
 * @param {object} handlers
 * @param {(remaining:number)=>void} [handlers.onTick]
 * @param {(remaining:number)=>void} [handlers.onWarningShow]
 * @param {()=>void} [handlers.onWarningHide]
 * @param {()=>void} handlers.onTimeout
 */
export function initInactivityWatcher(handlers) {
  callbacks = { ...callbacks, ...handlers };

  if (!started) {
    started = true;
    ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, handleActivity, { passive: true }));
  }

  resetInactivityTimer();
}

export function stopInactivityWatcher() {
  stopInterval();
}
