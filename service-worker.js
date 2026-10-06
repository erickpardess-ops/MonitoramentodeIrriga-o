// Service worker do app de Monitoramento (Cacau & Coco) — deixa o app abrir sem internet.
// Lembrete: suba este número de versão a cada atualização publicada.
const CACHE_NAME = 'irrigacao-cacau-coco-v3.9';
const PAGINA = './index.html';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'
];

// Guarda cada arquivo separadamente: se um falhar, os outros continuam guardados
// (antes, uma única falha cancelava tudo e o app ficava sem modo offline).
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const endereco = new URL(url, self.location).href;
        const resp = await fetch(new Request(endereco, { cache: 'reload' }));
        if (resp && resp.ok) await cache.put(endereco, resp);
      } catch (e) { /* sem internet ou arquivo ausente: tenta de novo na próxima atualização */ }
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmoSite = url.origin === self.location.origin;
  const sdkFirebase = url.origin === 'https://www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
  // Firebase (dados), Apps Script (planilha) e o resto: sempre direto pela internet, nunca do cache.
  if (!mesmoSite && !sdkFirebase) return;

  if (req.mode === 'navigate') {
    event.respondWith(abrirPagina(req));
    return;
  }
  event.respondWith(guardadoOuRede(req));
});

/** A página: tenta a internet por até 3 s (sinal fraco no campo) e, se não vier, abre a versão guardada. */
async function abrirPagina(req) {
  const cache = await caches.open(CACHE_NAME);
  const rede = fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
    .then((resp) => {
      if (resp && resp.ok) cache.put(new URL(PAGINA, self.location).href, resp.clone());
      return resp;
    });
  rede.catch(() => {});
  const guardada = (await cache.match(new URL(PAGINA, self.location).href)) ||
    (await cache.match(req, { ignoreSearch: true })) || (await cache.match(new URL('./', self.location).href));
  if (!guardada) return rede;                       // primeira vez neste aparelho: precisa de internet
  const prazo = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
  try {
    const resp = await Promise.race([rede, prazo]);
    return (resp && resp.ok) ? resp : guardada;
  } catch (e) {
    return guardada;
  }
}

/** Ícones, manifest e o código do Firebase: usa o guardado e atualiza em segundo plano. */
async function guardadoOuRede(req) {
  const cache = await caches.open(CACHE_NAME);
  const guardado = await cache.match(req, { ignoreSearch: true });
  const rede = fetch(req)
    .then((resp) => {
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => null);
  if (guardado) return guardado;
  const resp = await rede;
  return resp || new Response('', { status: 504, statusText: 'Sem internet' });
}
