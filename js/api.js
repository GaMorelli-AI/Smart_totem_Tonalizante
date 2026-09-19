// Comunicação com o backend (/api/generate).
//
// O frontend NUNCA escolhe modelo, prompt ou imagem de referência — envia
// apenas a foto e o código da cor. Tudo o mais é resolvido no servidor.

import { blobToDataURL } from './imaging.js';

const GENERATE_TIMEOUT_MS = 90_000;

export class GenerationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
  }
}

/**
 * Envia a foto original + o código da cor para o backend e retorna a URL
 * da imagem gerada.
 * @param {{ photoBlob: Blob, colorCode: string }} params
 * @returns {Promise<string>} URL da imagem gerada
 */
export async function generateSimulation({ photoBlob, colorCode }) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  try {
    const imageDataUrl = await blobToDataURL(photoBlob);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl, colorCode }),
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // resposta sem corpo JSON válido
    }

    if (!response.ok || !payload || !payload.imageUrl) {
      const message =
        (payload && payload.message) || 'Não conseguimos criar sua simulação desta vez.';
      throw new GenerationError(payload?.code || 'server_error', message);
    }

    return payload.imageUrl;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new GenerationError('timeout', 'Não conseguimos criar sua simulação desta vez.');
    }
    if (err instanceof GenerationError) throw err;
    throw new GenerationError('network_error', 'Não conseguimos criar sua simulação desta vez.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}
