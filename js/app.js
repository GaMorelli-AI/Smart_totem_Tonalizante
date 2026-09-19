import { CATEGORIES, getTonalizantesByCategory } from './colors.js';
import { session, setScreen, setSelectedColor, setOriginalPhoto, clearOriginalPhoto, setGeneratedImageUrl } from './state.js';
import { requestCameraStream, attachCameraStream, stopCamera, capturePhoto, CameraError } from './camera.js';
import { optimizePhotoBlob } from './imaging.js';
import { generateSimulation, GenerationError } from './api.js';
import { trackEvent } from './analytics.js';
import {
  configureSession,
  resetSession,
  finishSession,
  beginGenerating,
  endGenerating,
  startSessionWatchers,
} from './session.js';

// ---------------------------------------------------------------------------
// Referências de DOM
// ---------------------------------------------------------------------------

const telas = document.querySelectorAll('.tela');

const grade = document.getElementById('grade-cores');
const chipsWrap = document.getElementById('categorias-chips');
const btnConfirmarCor = document.getElementById('btn-confirmar-cor');

const preparoImagem = document.getElementById('preparo-cor-imagem');
const preparoNome = document.getElementById('preparo-cor-nome');
const preparoCodigo = document.getElementById('preparo-cor-codigo');

const video = document.getElementById('video-camera');
const btnCapturar = document.getElementById('btn-capturar');
const cameraErroPainel = document.getElementById('camera-erro');
const cameraErroMensagem = document.getElementById('camera-erro-mensagem');

const fotoConfirmacao = document.getElementById('foto-confirmacao');

const mensagemProcessando = document.getElementById('mensagem-processando');

const imgAntes = document.getElementById('img-antes');
const imgDepois = document.getElementById('img-depois');
const comparador = document.getElementById('comparador');
const comparadorAntesWrap = document.getElementById('comparador-antes-wrap');
const comparadorLinha = document.getElementById('comparador-linha');
const produtoImagem = document.getElementById('produto-selecionado-imagem');
const produtoNome = document.getElementById('produto-selecionado-nome');
const produtoCodigo = document.getElementById('produto-selecionado-codigo');

const erroMensagem = document.getElementById('erro-mensagem');

const modalInatividade = document.getElementById('modal-inatividade');
const modalContador = document.getElementById('modal-contador');

let categoriaAtual = 'todos';
let cameraRequestId = 0;
let mensagemProcessandoTimer = null;

const MENSAGENS_PROCESSANDO = [
  'Preparando seu novo visual...',
  'Analisando sua foto...',
  'Preparando a tonalidade...',
  'Aplicando sua nova cor...',
  'Quase pronto...',
];

// ---------------------------------------------------------------------------
// Navegação entre telas
// ---------------------------------------------------------------------------

const SCREEN_EXIT_HANDLERS = {
  processando: pararRotacaoMensagens,
  camera: saindoDaCamera,
};

const SCREEN_ENTER_HANDLERS = {
  cores: renderizarGrade,
  preparo: renderizarPreparo,
  camera: entrarNaCamera,
  confirmacao: () => {
    fotoConfirmacao.src = session.originalPhotoUrl || '';
  },
  processando: iniciarRotacaoMensagens,
  resultado: renderizarResultado,
};

function goToScreen(nome) {
  const anterior = session.currentScreen;
  if (SCREEN_EXIT_HANDLERS[anterior]) SCREEN_EXIT_HANDLERS[anterior]();

  telas.forEach((el) => {
    el.classList.toggle('ativa', el.dataset.tela === nome);
  });
  setScreen(nome);

  if (SCREEN_ENTER_HANDLERS[nome]) SCREEN_ENTER_HANDLERS[nome]();
}

// ---------------------------------------------------------------------------
// Tela: escolha da tonalidade
// ---------------------------------------------------------------------------

function renderizarChips() {
  chipsWrap.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = cat.label;
    chip.dataset.categoria = cat.id;
    chip.classList.toggle('chip-ativo', cat.id === categoriaAtual);
    chip.addEventListener('click', () => {
      categoriaAtual = cat.id;
      renderizarGrade();
    });
    chipsWrap.appendChild(chip);
  });
}

function renderizarGrade() {
  renderizarChips();
  grade.innerHTML = '';

  const lista = getTonalizantesByCategory(categoriaAtual);

  lista.forEach((cor, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cor-card';
    card.setAttribute('aria-pressed', String(session.selectedColor?.code === cor.code));
    if (session.selectedColor?.code === cor.code) card.classList.add('cor-card-selecionado');

    card.innerHTML = `
      <span class="cor-card-imagem">
        <img src="${cor.productImage}" alt="Tonalizante ${cor.code} ${cor.name}" ${index > 5 ? 'loading="lazy"' : ''}>
      </span>
      <span class="cor-card-codigo">${cor.code}</span>
      <span class="cor-card-nome">${cor.name}</span>
      <span class="cor-card-check" aria-hidden="true">✓</span>
    `;

    card.addEventListener('click', () => {
      setSelectedColor(cor);
      trackEvent('color_selected', { colorCode: cor.code, colorName: cor.name });
      renderizarGrade();
    });

    grade.appendChild(card);
  });

  btnConfirmarCor.disabled = !session.selectedColor;
}

// ---------------------------------------------------------------------------
// Tela: preparação da foto
// ---------------------------------------------------------------------------

function renderizarPreparo() {
  const cor = session.selectedColor;
  if (!cor) return;
  preparoImagem.src = cor.productImage;
  preparoImagem.alt = `Tonalizante ${cor.code} ${cor.name}`;
  preparoNome.textContent = cor.name;
  preparoCodigo.textContent = cor.code;
}

// ---------------------------------------------------------------------------
// Tela: câmera
// ---------------------------------------------------------------------------

async function entrarNaCamera() {
  const requestId = ++cameraRequestId;
  esconderErroCamera();
  btnCapturar.disabled = true;

  try {
    const stream = await requestCameraStream();
    if (requestId !== cameraRequestId) {
      // Uma navegação mais recente já ocorreu; descarta sem tocar na sessão.
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    await attachCameraStream(video, stream);
    btnCapturar.disabled = false;
    trackEvent('camera_opened');
  } catch (err) {
    if (requestId !== cameraRequestId) return;
    const message = err instanceof CameraError ? err.message : 'Não foi possível abrir a câmera agora.';
    mostrarErroCamera(message);
  }
}

function saindoDaCamera() {
  // Invalida qualquer startCamera() ainda em andamento (ex.: usuário saiu
  // da tela antes do navegador liberar a permissão) e libera a stream atual.
  cameraRequestId += 1;
  stopCamera();
}

function mostrarErroCamera(mensagem) {
  cameraErroMensagem.textContent = mensagem;
  cameraErroPainel.hidden = false;
}

function esconderErroCamera() {
  cameraErroPainel.hidden = true;
}

async function aoCapturar() {
  if (btnCapturar.disabled) return;
  btnCapturar.disabled = true;

  try {
    const blobBruto = await capturePhoto(video);
    const blobOtimizado = await optimizePhotoBlob(blobBruto);
    stopCamera();
    setOriginalPhoto(blobOtimizado);
    trackEvent('photo_captured');
    goToScreen('confirmacao');
  } catch (err) {
    mostrarErroCamera('Não foi possível capturar a foto agora.');
    btnCapturar.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Tela: processando
// ---------------------------------------------------------------------------

function iniciarRotacaoMensagens() {
  let i = 0;
  mensagemProcessando.textContent = MENSAGENS_PROCESSANDO[0];
  mensagemProcessandoTimer = window.setInterval(() => {
    i = (i + 1) % MENSAGENS_PROCESSANDO.length;
    mensagemProcessando.textContent = MENSAGENS_PROCESSANDO[i];
  }, 2200);
}

function pararRotacaoMensagens() {
  if (mensagemProcessandoTimer) {
    window.clearInterval(mensagemProcessandoTimer);
    mensagemProcessandoTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Geração da simulação
// ---------------------------------------------------------------------------

async function iniciarGeracao() {
  const cor = session.selectedColor;
  if (!cor || !session.originalPhoto) return;

  goToScreen('processando');
  beginGenerating();
  trackEvent('generation_started', { colorCode: cor.code });

  try {
    const url = await generateSimulation({ photoBlob: session.originalPhoto, colorCode: cor.code });
    setGeneratedImageUrl(url);
    trackEvent('generation_success', { colorCode: cor.code });
    goToScreen('resultado');
    trackEvent('result_viewed', { colorCode: cor.code });
  } catch (err) {
    const message =
      err instanceof GenerationError ? err.message : 'Não conseguimos criar sua simulação desta vez.';
    trackEvent('generation_error', { colorCode: cor.code, code: err.code || 'unknown' });
    erroMensagem.textContent = message;
    goToScreen('erro');
  } finally {
    endGenerating();
  }
}

// ---------------------------------------------------------------------------
// Tela: resultado + comparador antes/depois
// ---------------------------------------------------------------------------

function renderizarResultado() {
  const cor = session.selectedColor;
  imgAntes.src = session.originalPhotoUrl || '';
  imgDepois.src = session.generatedImageUrl || '';

  if (cor) {
    produtoImagem.src = cor.productImage;
    produtoImagem.alt = `Tonalizante ${cor.code} ${cor.name}`;
    produtoNome.textContent = cor.name;
    produtoCodigo.textContent = cor.code;
  }

  definirPosicaoComparador(50);
}

let comparadorPercentualAtual = 50;

function definirPosicaoComparador(percentual) {
  const clamped = Math.min(100, Math.max(0, percentual));
  comparadorPercentualAtual = clamped;
  comparadorAntesWrap.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
  comparadorLinha.style.left = `${clamped}%`;
  comparadorLinha.setAttribute('aria-valuenow', String(Math.round(clamped)));
}

function configurarComparador() {
  let arrastando = false;

  function calcularPercentual(clientX) {
    const rect = comparador.getBoundingClientRect();
    const x = clientX - rect.left;
    return (x / rect.width) * 100;
  }

  function aoMover(evento) {
    if (!arrastando) return;
    const clientX = evento.touches ? evento.touches[0].clientX : evento.clientX;
    definirPosicaoComparador(calcularPercentual(clientX));
  }

  function iniciarArraste(evento) {
    arrastando = true;
    const clientX = evento.touches ? evento.touches[0].clientX : evento.clientX;
    definirPosicaoComparador(calcularPercentual(clientX));
  }

  function pararArraste() {
    arrastando = false;
  }

  comparador.addEventListener('pointerdown', iniciarArraste);
  window.addEventListener('pointermove', aoMover);
  window.addEventListener('pointerup', pararArraste);

  comparadorLinha.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowLeft') definirPosicaoComparador(comparadorPercentualAtual - 5);
    if (evento.key === 'ArrowRight') definirPosicaoComparador(comparadorPercentualAtual + 5);
  });
}

// ---------------------------------------------------------------------------
// Modal de inatividade
// ---------------------------------------------------------------------------

function mostrarModalInatividade(segundosRestantes) {
  modalContador.textContent = String(segundosRestantes);
  modalInatividade.hidden = false;
  document.body.classList.add('modal-aberto');
}

function esconderModalInatividade() {
  modalInatividade.hidden = true;
  document.body.classList.remove('modal-aberto');
}

// ---------------------------------------------------------------------------
// Delegação de ações (data-action)
// ---------------------------------------------------------------------------

const ACTIONS = {
  start() {
    trackEvent('flow_started');
    goToScreen('cores');
  },
  'voltar-home'() {
    resetSession();
  },
  'confirmar-cor'() {
    if (!session.selectedColor) return;
    goToScreen('preparo');
  },
  'voltar-cores'() {
    goToScreen('cores');
  },
  'abrir-camera'() {
    goToScreen('camera');
  },
  'fechar-camera'() {
    stopCamera();
    goToScreen('preparo');
  },
  'retry-camera'() {
    entrarNaCamera();
  },
  capturar: aoCapturar,
  'tirar-outra'() {
    trackEvent('photo_retake');
    clearOriginalPhoto();
    goToScreen('camera');
  },
  'usar-foto'() {
    trackEvent('photo_confirmed');
    iniciarGeracao();
  },
  'testar-outra-cor'() {
    trackEvent('try_another_color');
    setSelectedColor(null);
    goToScreen('cores');
  },
  finalizar() {
    finishSession();
  },
  'tentar-novamente'() {
    iniciarGeracao();
  },
  'voltar-cores-erro'() {
    goToScreen('cores');
  },
  'continuar-sessao'() {
    esconderModalInatividade();
  },
};

document.addEventListener('click', (evento) => {
  const alvo = evento.target.closest('[data-action]');
  if (!alvo) return;
  const acao = ACTIONS[alvo.dataset.action];
  if (acao) acao(evento);
});

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

configureSession({
  goToScreen,
  onInactivityWarning: mostrarModalInatividade,
  onInactivityWarningHide: esconderModalInatividade,
});

configurarComparador();
renderizarChips();
startSessionWatchers();

// Evita que o zoom por double-tap/gesto atrapalhe o uso em totem.
document.addEventListener('dblclick', (e) => e.preventDefault());
