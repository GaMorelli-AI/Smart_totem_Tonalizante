// Estado central único da sessão do totem.
// Nenhum outro módulo deve manter estado próprio espalhado — tudo
// relacionado à sessão do consumidor atual vive aqui.

export const session = {
  currentScreen: 'home',

  selectedColor: null, // objeto de js/colors.js

  originalPhoto: null, // Blob da selfie (já otimizada)
  originalPhotoUrl: null, // Object URL para <img>/<video> exibirem originalPhoto

  generatedImageUrl: null, // URL remota retornada pelo backend (Replicate)

  cameraStream: null, // MediaStream ativa da câmera, se houver

  generating: false, // true enquanto aguarda o backend/IA
};

export function setScreen(screen) {
  session.currentScreen = screen;
}

export function setSelectedColor(color) {
  session.selectedColor = color;
}

export function setOriginalPhoto(blob) {
  clearOriginalPhoto();
  session.originalPhoto = blob;
  session.originalPhotoUrl = blob ? URL.createObjectURL(blob) : null;
}

export function clearOriginalPhoto() {
  if (session.originalPhotoUrl) {
    URL.revokeObjectURL(session.originalPhotoUrl);
  }
  session.originalPhoto = null;
  session.originalPhotoUrl = null;
}

export function setGeneratedImageUrl(url) {
  session.generatedImageUrl = url;
}

export function clearGeneratedImage() {
  session.generatedImageUrl = null;
}

export function setGenerating(value) {
  session.generating = Boolean(value);
}
