// Servidor de desenvolvimento local — SEM depender da CLI da Vercel
// (que exige login/link de projeto e pode falhar por permissão em alguns
// ambientes). Serve os arquivos estáticos e roteia POST /api/generate para
// o mesmo handler usado em produção (api/generate.js), então o
// comportamento é idêntico ao deploy real na Vercel.
//
// Uso: npm run dev  (executa este arquivo com Node)
// Produção continua sendo Vercel normalmente (vercel / vercel --prod).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Carrega .env manualmente (sem dependência extra) — vercel dev faria isso
// automaticamente, mas aqui rodamos com Node puro.
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function withVercelHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(payload));
  };
  return res;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function handleApiGenerate(req, res) {
  if (req.method !== 'POST') {
    return withVercelHelpers(res).status(405).json({ code: 'method_not_allowed', message: 'Método não permitido.' });
  }

  try {
    req.body = await readJsonBody(req);
  } catch {
    return withVercelHelpers(res).status(400).json({ code: 'invalid_json', message: 'JSON inválido.' });
  }

  // Import dinâmico (com cache-busting) para refletir edições sem reiniciar o processo.
  const modulePath = pathToFileURL(path.join(ROOT, 'api', 'generate.js')).href;
  const { default: handler } = await import(`${modulePath}?t=${Date.now()}`);
  return handler(req, withVercelHelpers(res));
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Nunca servir nada fora da raiz do projeto (proteção simples de path traversal).
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found: ' + urlPath);
      return;
    }
    res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath)] || 'application/octet-stream');
    // Em desenvolvimento, nunca deixar o navegador cachear HTML/CSS/JS — um
    // reload precisa sempre refletir o arquivo atual em disco.
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/generate')) {
    handleApiGenerate(req, res).catch((err) => {
      console.error('[dev-server] erro inesperado em /api/generate:', err);
      withVercelHelpers(res).status(500).json({ code: 'server_error', message: 'Erro interno.' });
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\nSmart Totem — Tonalizantes rodando em http://localhost:${PORT}\n`);
  if (!process.env.REPLICATE_API_TOKEN) {
    console.log(
      'Aviso: REPLICATE_API_TOKEN não está definido — a geração vai falhar até você configurar o .env.\n'
    );
  }
});
