// POST /api/generate
//
// Único endpoint exposto ao frontend. Recebe apenas { image, colorCode }.
// Modelo, prompt e imagem de referência são SEMPRE resolvidos aqui, a
// partir de uma whitelist própria do servidor — o frontend nunca escolhe
// esses valores.

import Replicate from 'replicate';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ALLOWED_COLORS } from './_colors-whitelist.js';
import { buildPrompt } from './_prompt.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // a foto já chega otimizada do frontend, isto é só uma margem de segurança
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const REPLICATE_MODEL = 'google/nano-banana-pro';
const REPLICATE_TIMEOUT_MS = 100_000;

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return { mimeType, base64 };
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('replicate_timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Normaliza o retorno do Replicate (string, array ou FileOutput) numa URL. */
async function resolveOutputUrl(output) {
  if (!output) return null;
  if (Array.isArray(output)) return resolveOutputUrl(output[0]);
  if (typeof output === 'string') return output;
  if (typeof output.url === 'function') {
    const url = await output.url();
    if (typeof url === 'string') return url;
    if (url && typeof url.href === 'string') return url.href;
    return null;
  }
  if (typeof output.href === 'string') return output.href;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ code: 'method_not_allowed', message: 'Método não permitido.' });
  }

  const startedAt = Date.now();
  const body = req.body || {};
  const { image, colorCode } = body;

  if (typeof colorCode !== 'string' || !Object.prototype.hasOwnProperty.call(ALLOWED_COLORS, colorCode)) {
    return res
      .status(400)
      .json({ code: 'invalid_color', message: 'Não conseguimos criar sua simulação desta vez.' });
  }

  const parsedImage = parseDataUrl(image);
  if (!parsedImage || !ALLOWED_MIME_TYPES.has(parsedImage.mimeType)) {
    return res
      .status(400)
      .json({ code: 'invalid_image', message: 'Não conseguimos criar sua simulação desta vez.' });
  }

  const imageBuffer = Buffer.from(parsedImage.base64, 'base64');
  if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_BYTES) {
    return res
      .status(400)
      .json({ code: 'image_too_large', message: 'Não conseguimos criar sua simulação desta vez.' });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    // Detalhe técnico fica só no log do servidor — o consumidor nunca vê isto.
    console.error(JSON.stringify({ event: 'generation_failed', reason: 'missing_api_token' }));
    return res
      .status(500)
      .json({ code: 'server_misconfigured', message: 'Não conseguimos criar sua simulação desta vez.' });
  }

  const color = ALLOWED_COLORS[colorCode];
  console.log(JSON.stringify({ event: 'generation_started', colorCode }));

  try {
    const referencePath = path.join(process.cwd(), color.referenceImage);
    const referenceBuffer = await readFile(referencePath);
    const referenceDataUrl = `data:image/webp;base64,${referenceBuffer.toString('base64')}`;
    const userImageDataUrl = `data:${parsedImage.mimeType};base64,${parsedImage.base64}`;

    const prompt = buildPrompt(color.name, colorCode);
    const replicate = new Replicate();

    const output = await withTimeout(
      replicate.run(REPLICATE_MODEL, {
        input: {
          prompt,
          image_input: [userImageDataUrl, referenceDataUrl],
          aspect_ratio: 'match_input_image',
          resolution: '2K',
          output_format: 'jpg',
        },
      }),
      REPLICATE_TIMEOUT_MS
    );

    const imageUrl = await resolveOutputUrl(output);
    if (!imageUrl) throw new Error('empty_output');

    const durationMs = Date.now() - startedAt;
    console.log(JSON.stringify({ event: 'generation_completed', colorCode, durationMs }));

    return res.status(200).json({ imageUrl });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const reason = err instanceof Error ? err.message : 'unknown_error';
    console.error(JSON.stringify({ event: 'generation_failed', colorCode, durationMs, reason }));

    return res.status(502).json({
      code: 'generation_failed',
      message: 'Não conseguimos criar sua simulação desta vez.',
    });
  }
}
