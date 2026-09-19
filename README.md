# Bio Extratus — Smart Totem — Simulador de Tonalizantes

Módulo 02 do Smart Totem Bio Extratus. Permite que o consumidor escolha uma
tonalidade da linha **Bio Extratus Color**, tire uma selfie na câmera do
próprio tablet e veja uma simulação de como ficaria com aquela cor, com
comparador antes/depois, antes de decidir experimentar outra cor ou finalizar
a experiência.

O primeiro módulo (Consultoria Capilar) continua em
`https://n8n.newxsolutions.com.br/webhook/bioextratus-form`. Este projeto foi
construído a partir de uma auditoria visual completa daquele Smart Totem, para
que os dois módulos pareçam parte do mesmo produto.

---

## 1. Sobre o projeto

- Frontend 100% HTML5 + CSS3 + JavaScript vanilla (sem frameworks), pensado
  para rodar em tela cheia num tablet Android/iOS em pé (retrato).
- Backend: uma única função serverless (`api/generate.js`), pensada para a
  Vercel, responsável por chamar o modelo `google/nano-banana-pro` no
  Replicate.
- Nenhuma foto é armazenada em disco, banco de dados ou localStorage — tudo
  vive apenas na memória da sessão do navegador enquanto o consumidor usa o
  totem.

## 2. Arquitetura

```
Tablet (navegador em tela cheia)
   │
   │  1) captura a selfie (getUserMedia + <canvas>)
   │  2) POST /api/generate  { image: dataURL, colorCode }
   ▼
/api/generate.js (Vercel Serverless Function)
   │
   │  3) valida colorCode contra whitelist própria (api/_colors-whitelist.js)
   │  4) monta o prompt (api/_prompt.js)
   │  5) chama replicate.run("google/nano-banana-pro", { image_input: [...] })
   ▼
Replicate → devolve a URL da imagem gerada
   │
   ▼
Tablet exibe o resultado (comparador antes/depois)
```

O frontend nunca escolhe modelo, prompt ou imagem de referência — apenas
`colorCode`. Tudo o mais é resolvido no servidor a partir de uma whitelist
própria (`ALLOWED_COLORS`), que nunca confia em dados vindos do cliente.

## 3. Estrutura de pastas

```
Smart_totem/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # controlador principal: telas, eventos, orquestração
│   ├── state.js         # estado central único da sessão
│   ├── session.js        # reset completo, finalizar, pausa/retoma do timer
│   ├── camera.js         # getUserMedia, captura, cleanup de tracks
│   ├── imaging.js        # otimização da foto antes do upload
│   ├── inactivity.js      # timer de 30s + aviso nos últimos 5s
│   ├── api.js           # chamada a /api/generate
│   ├── colors.js         # dados de UI dos 19 tonalizantes
│   └── analytics.js       # trackEvent(...) (console em dev; webhook futuro)
├── assets/
│   ├── logo/            # logo oficial Bio Extratus (mesmo asset do totem 1)
│   ├── products/         # 1 imagem de embalagem/produto por tonalizante
│   ├── colors/           # 1 imagem de referência de cor (recorte de cabelo) por tonalizante
│   ├── icons/
│   └── ui/               # plano de fundo da attract screen
├── api/
│   ├── generate.js        # endpoint único exposto ao frontend
│   ├── _colors-whitelist.js # whitelist server-side (nome + referenceImage)
│   └── _prompt.js         # monta o prompt do Nano Banana Pro
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```

## 4. Pré-requisitos

- Node.js 18+ (recomendado 20+)
- Uma conta na [Vercel](https://vercel.com) (só para o deploy — não é
  necessária para rodar localmente)
- Um token de API do [Replicate](https://replicate.com/account/api-tokens)

## 5. Instalação

```bash
npm install
```

## 6. Executar localmente

```bash
npm run dev
```

Isso executa `node dev-server.mjs`: um servidor local sem dependências
próprias que serve `index.html`/`css`/`js` como arquivos estáticos **e**
roteia `POST /api/generate` para o mesmo `api/generate.js` usado em
produção — sem exigir login/link na Vercel. Ele também carrega o arquivo
`.env` automaticamente.

Acesse `http://localhost:3000`.

> Por que não `vercel dev`? Ele funciona, mas exige vincular o projeto à
> sua conta Vercel na primeira execução (`vercel login` / `vercel link`) e,
> em ambientes com permissões restritas, pode falhar ao tentar criar seu
> arquivo de configuração em `AppData`. `dev-server.mjs` evita essa
> dependência para o dia a dia; `vercel`/`vercel --prod` continuam sendo o
> caminho normal para o **deploy** (seção 10).

## 7. Configurar o Replicate

1. Crie um token em https://replicate.com/account/api-tokens
2. Copie `.env.example` para `.env` e cole o token:

```bash
cp .env.example .env
```

```
REPLICATE_API_TOKEN=r8_xxx...
```

O SDK oficial (`replicate`) lê `REPLICATE_API_TOKEN` automaticamente do
ambiente — não é necessário passar o token manualmente no código.

## 8. `.env` local

`vercel dev` carrega `.env`/`.env.local` automaticamente. Nunca commite esse
arquivo — ele já está no `.gitignore`.

## 9. Testando a câmera localmente

- `getUserMedia` funciona em `http://localhost` mesmo sem HTTPS (exceção do
  navegador para localhost).
- Em qualquer outro host (rede local, staging, produção) a câmera **exige
  HTTPS**. A Vercel já serve tudo em HTTPS por padrão.
- Ao abrir pela primeira vez, o navegador vai pedir permissão de câmera —
  aceite. Se negar, a aplicação mostra a mensagem de erro e um botão para
  tentar novamente.

## 10. Deploy na Vercel

```bash
vercel
vercel --prod
```

Ou conecte o repositório Git diretamente pelo painel da Vercel (Import
Project). O `vercel.json` já configura:

- `api/generate.js` com `maxDuration: 120` (a geração pode levar mais de
  30s). Com Fluid Compute (padrão atual da Vercel), o teto de duração é
  300s no plano Hobby e 800s no Pro — 120s funciona em qualquer um dos
  dois sem configuração extra.
- `includeFiles: "assets/colors/**"`, garantindo que as imagens de
  referência estejam disponíveis para a função em produção (elas são lidas
  do disco, não fazem uma requisição HTTP).

## 11. Cadastrar a variável de ambiente na Vercel

No painel do projeto: **Settings → Environment Variables**

| Nome                    | Valor              | Ambientes                    |
|-------------------------|---------------------|-------------------------------|
| `REPLICATE_API_TOKEN`   | seu token Replicate | Production, Preview, Development |

Depois de cadastrar, refaça o deploy (`vercel --prod`) para que a variável
seja aplicada.

## 12. Como funcionam as tonalidades

Duas listas independentes e propositalmente separadas:

- **`js/colors.js`** (frontend): nome, categoria e imagem de produto — usada
  só para desenhar a interface.
- **`api/_colors-whitelist.js`** (backend): nome oficial + caminho da imagem
  de referência de cor — é a única fonte de verdade usada para montar o
  prompt e chamar o Replicate. O frontend manda apenas `colorCode`; o
  servidor rejeita qualquer código que não exista aqui.

Os 19 tonalizantes vêm do "Catálogo Tonalizantes.pdf" oficial da Bio
Extratus (conferido meticulosamente, nenhum produto foi inventado).

## 13. Como adicionar/alterar uma cor

1. Adicione a imagem do produto em `assets/products/<codigo>.webp`.
2. Adicione a imagem de referência de cor (idealmente cabelo/mecha, não só
   embalagem) em `assets/colors/<codigo>.webp`.
3. Adicione a entrada em `js/colors.js` (nome, categoria, código).
4. Adicione a entrada correspondente em `api/_colors-whitelist.js` (nome +
   `referenceImage`).

## 14. Como alterar a imagem de referência de uma cor

Troque o arquivo em `assets/colors/<codigo>.webp` e o campo `referenceImage`
em `api/_colors-whitelist.js`, se o caminho mudar. Nenhuma outra alteração é
necessária — o backend lê o arquivo do disco a cada geração.

## 15. Como funciona o prompt

`api/_prompt.js` monta o prompt enviado ao Nano Banana Pro. A regra central,
que não deve ser removida: **alterar somente a cor do cabelo**, preservando
identidade, rosto, roupas, fundo, enquadramento, corte e textura do cabelo. O
nome/código da cor são interpolados a partir da whitelist do servidor, nunca
do frontend.

## 16. Como funciona a privacidade

- Nenhuma foto é gravada em disco, banco de dados, `localStorage` ou
  `IndexedDB`.
- A foto original e a imagem gerada existem apenas em memória
  (`session.originalPhoto` / `session.generatedImageUrl`) durante a sessão
  atual.
- `resetSession()` (chamada ao finalizar, por inatividade, ou manualmente)
  revoga o Object URL da foto e limpa todas as referências.
- O backend não grava a selfie nem a URL do resultado em lugar nenhum —
  apenas repassa para o Replicate e devolve a URL da resposta.

## 17. Como funciona o timer de inatividade

- 30 segundos sem interação (`pointerdown`, `touchstart`, `click`,
  `keydown`) reiniciam o contador.
- Nos últimos 5 segundos, um modal aparece com contagem regressiva e um
  botão "Continuar experiência".
- Ao chegar a zero, `resetSession()` é chamado automaticamente.
- Enquanto `session.generating === true` (aguardando o Replicate), o timer
  fica pausado — a geração pode levar bem mais que 30s sem derrubar a
  sessão. Ao terminar (sucesso ou erro), o timer volta a contar do zero.

Implementado em `js/inactivity.js` + `js/session.js`.

## 18. Como funciona `resetSession()`

Centralizada em `js/session.js`. A cada chamada:

1. Para a câmera (`stopCamera()`), se houver stream ativa.
2. Revoga o Object URL da foto original e limpa a referência.
3. Limpa a URL da imagem gerada.
4. Zera a tonalidade selecionada.
5. Fecha qualquer modal aberto.
6. Volta para a tela inicial.
7. Reinicia o timer de inatividade do zero.

## 19. Como funciona a câmera

`js/camera.js` expõe `requestCameraStream()` (só pede a permissão/stream,
sem efeitos colaterais) e `attachCameraStream()` (conecta o stream ao
`<video>` e o registra na sessão). Essa separação existe para evitar uma
condição de corrida: se o consumidor sair da tela de câmera antes da
permissão ser concedida, o stream "atrasado" é descartado imediatamente em
vez de sobrescrever um stream mais novo.

A captura (`capturePhoto`) desenha o frame atual do `<video>` num
`<canvas>` (espelhado horizontalmente, para a foto sair como um espelho
natural) e gera um `Blob` JPEG — sem depender de reconhecimento facial ou
biometria.

## 20. Como funciona o cleanup

- `stopCamera()` para todas as tracks da `MediaStream` ativa.
- Toda troca de tela chama os `SCREEN_EXIT_HANDLERS` correspondentes (em
  `js/app.js`), que param a câmera ao sair da tela de câmera e limpam o
  intervalo de mensagens ao sair da tela de processamento.
- `URL.createObjectURL()` (usado só para a foto original) é sempre pareado
  com `URL.revokeObjectURL()` em `clearOriginalPhoto()` (`js/state.js`).
- A imagem gerada é apenas uma URL remota do Replicate — não é baixada nem
  vira Object URL, então não precisa de revogação.

## 21. Como funcionam os eventos (analytics)

`js/analytics.js` expõe `trackEvent(nome, metadata)`. Hoje ele só registra em
`console.debug` (apenas em `localhost`). A arquitetura já está pronta para
enviar os eventos para um webhook: basta preencher `ANALYTICS_WEBHOOK_URL`
em `js/analytics.js`. Eventos disparados: `session_started`,
`flow_started`, `color_selected`, `camera_opened`, `photo_captured`,
`photo_retake`, `photo_confirmed`, `generation_started`,
`generation_success`, `generation_error`, `result_viewed`,
`try_another_color`, `session_finished`, `session_timeout`.

## 22. Como alterar o timeout da geração

- Frontend: `GENERATE_TIMEOUT_MS` em `js/api.js` (padrão 90s) — depois disso
  o `fetch` é abortado e o usuário vê a tela de erro.
- Backend: `REPLICATE_TIMEOUT_MS` em `api/generate.js` (padrão 100s) — passa
  a chamada ao Replicate por um timeout próprio, além do limite de duração
  da função na Vercel (`maxDuration` em `vercel.json`).

## 23. Rate limiting

Não implementado agora (para não exigir um banco externo), mas o endpoint
está isolado em `api/generate.js` com toda a validação de entrada já feita
no topo da função — um middleware de rate limit (ex.: por IP, usando Vercel
KV/Upstash) pode ser adicionado ali sem tocar no resto da aplicação.

## 24. Limitações conhecidas

- A imagem de referência de cada tonalidade foi recortada automaticamente
  das fotos de embalagem do catálogo oficial (rosto + cabelo do modelo,
  sem a lateral com a lista de ingredientes nem a faixa dourada da marca).
  Funciona bem como referência cromática, mas pode ser substituída por uma
  mecha de cabelo isolada, se a Bio Extratus fornecer esse asset.
- O "Cartela_de_Cores_atualizada.pdf" contém ~50 amostras de cabelo em
  forma de cone, sem nenhum rótulo de texto no PDF — não foi possível
  mapear cada amostra ao código correto do tonalizante com segurança, então
  essas imagens não foram usadas como referência de cor (para não arriscar
  aplicar a cor errada). Foram usadas apenas como confirmação visual da
  identidade cromática da linha durante o desenvolvimento.
- Sem rate limiting embutido (ver seção 23).
- O comparador antes/depois usa `clip-path`, suportado por todos os
  navegadores modernos usados em tablets Android/iOS atuais.
- A chamada real ao Replicate (`google/nano-banana-pro`) foi implementada
  e revisada com base na documentação/schema atual do modelo, mas **não
  foi executada de ponta a ponta nesta sessão** (não havia um
  `REPLICATE_API_TOKEN` disponível para isso). O primeiro teste com um
  token real — local ou já em produção — é o que confirma definitivamente
  o formato de retorno do SDK; `resolveOutputUrl()` em `api/generate.js`
  já trata os formatos documentados (string, array, objeto com `.url()`),
  mas vale acompanhar os logs (`generation_completed`/`generation_failed`)
  nesse primeiro teste.

## 25. Configuração manual necessária

- [ ] Cadastrar `REPLICATE_API_TOKEN` na Vercel (Environment Variables).
- [ ] Fazer uma primeira geração real após o deploy para confirmar o
      formato de retorno do Replicate (ver seção 24).
- [ ] Testar o fluxo completo num tablet real (câmera frontal, toque,
      inatividade) antes de instalar no ponto de venda.
- [ ] Opcional: preencher `ANALYTICS_WEBHOOK_URL` em `js/analytics.js` caso
      queira capturar os eventos de uso.

## Troubleshooting

**A câmera não abre / mostra "Precisamos de acesso à câmera..."**
O navegador negou a permissão. No Android/iOS, isso costuma exigir liberar a
permissão manualmente nas configurações do site depois de uma primeira
negativa (o botão "Tentar novamente" não reabre o prompt do sistema depois
de uma negação permanente).

**"Não encontramos uma câmera disponível neste dispositivo"**
Verifique se outro aplicativo não está usando a câmera e se o tablet tem
uma câmera frontal.

**A simulação sempre falha**
Confirme que `REPLICATE_API_TOKEN` está configurado (local: `.env`; Vercel:
Environment Variables) e que a conta Replicate tem créditos disponíveis.
Veja os logs da função (`vercel logs` ou o painel da Vercel) — eles
registram `generation_started` / `generation_completed` /
`generation_failed` com a duração, mas nunca a imagem em si.

**Erro 413 / payload muito grande**
A foto é otimizada no navegador antes do envio (`js/imaging.js`,
`MAX_DIMENSION = 1440`), mas funções serverless da Vercel têm um limite de
corpo de requisição (na ordem de poucos MB). Se necessário, reduza
`MAX_DIMENSION` ou a qualidade JPEG nesse arquivo.
