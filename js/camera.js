// Acesso à câmera do tablet: abrir, capturar foto, encerrar.
// Este módulo NUNCA realiza reconhecimento facial ou biometria —
// apenas exibe o vídeo e captura um frame estático quando solicitado.

import { session } from './state.js';

export class CameraError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CameraError';
    this.code = code;
  }
}

function mapGetUserMediaError(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return new CameraError(
        'NotAllowedError',
        'Precisamos de acesso à câmera para criar sua simulação.'
      );
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraError(
        'NotFoundError',
        'Não encontramos uma câmera disponível neste dispositivo.'
      );
    case 'NotReadableError':
    case 'TrackStartError':
      return new CameraError(
        'NotReadableError',
        'A câmera parece estar sendo usada por outro aplicativo.'
      );
    default:
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return new CameraError(
          'Unsupported',
          'Este navegador não é compatível com a câmera do totem.'
        );
      }
      return new CameraError('Unknown', 'Não foi possível abrir a câmera agora.');
  }
}

/**
 * Solicita a câmera frontal. NÃO conecta o stream a nada nem grava em
 * `session` — isso é responsabilidade de quem chama (veja js/app.js), para
 * que chamadas concorrentes (navegação rápida entre telas) possam descartar
 * um stream "atrasado" sem correr o risco de sobrescrever um stream mais
 * novo que já esteja ativo.
 * @returns {Promise<MediaStream>}
 */
export async function requestCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
    });
  } catch (err) {
    throw mapGetUserMediaError(err);
  }
}

/** Conecta um stream já obtido a um elemento <video> e o registra na sessão. */
export async function attachCameraStream(videoEl, stream) {
  stopCamera();
  session.cameraStream = stream;
  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {});
}

/** Encerra todas as tracks da câmera ativa, se houver. */
export function stopCamera() {
  if (!session.cameraStream) return;
  session.cameraStream.getTracks().forEach((track) => track.stop());
  session.cameraStream = null;
}

/**
 * Congela o frame atual do vídeo e retorna um Blob JPEG.
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<Blob>}
 */
export function capturePhoto(videoEl) {
  return new Promise((resolve, reject) => {
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;

    if (!width || !height) {
      reject(new CameraError('NoFrame', 'Não foi possível capturar a foto agora.'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Espelha horizontalmente para a selfie ficar como um espelho natural.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new CameraError('CaptureFailed', 'Não foi possível capturar a foto agora.'));
      },
      'image/jpeg',
      0.92
    );
  });
}
