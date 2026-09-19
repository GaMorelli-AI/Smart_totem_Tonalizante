// Eventos de analytics do simulador.
//
// Por enquanto apenas registra em console (somente em desenvolvimento).
// A arquitetura já está pronta para, futuramente, enviar os eventos para
// um webhook: basta implementar `sendToWebhook` abaixo.

const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Preencha com a URL do webhook quando ele existir (ex.: n8n).
const ANALYTICS_WEBHOOK_URL = '';

function sendToWebhook(payload) {
  if (!ANALYTICS_WEBHOOK_URL) return;

  fetch(ANALYTICS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Falha de analytics nunca deve afetar a experiência do consumidor.
  });
}

/**
 * Registra um evento de uso do simulador.
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 */
export function trackEvent(eventName, metadata = {}) {
  const payload = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  if (isDev) {
    console.debug('[analytics]', payload);
  }

  sendToWebhook(payload);
}
