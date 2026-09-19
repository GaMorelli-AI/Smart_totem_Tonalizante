// Utilitários de imagem: redimensionar/comprimir a selfie antes do envio
// e converter Blob -> data URL (para o payload JSON de /api/generate).

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.88;

/**
 * Redimensiona (se necessário) e comprime um Blob de imagem, preservando
 * proporção e qualidade visual dos fios/textura do cabelo.
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 */
export async function optimizePhotoBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Falha ao otimizar a foto.'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

/** Converte um Blob em data URL (base64) para envio em JSON. */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}
