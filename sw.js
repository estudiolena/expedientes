/* Estudio Lena & Asociados: uso sin conexion */
const V = 'lena-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icono-app-192.png', './assets/icono-app-512.png'];
const CDN = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'];
const ES_CDN = /(^|\.)(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(u => fetch(u, {mode: 'no-cors'}).then(r => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
function conLimite(req, ms) {
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('lento')), ms); fetch(req).then(r => { clearTimeout(t); res(r); }, err => { clearTimeout(t); rej(err); }); });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const p = url.pathname;
    const esApp = req.mode === 'navigate' ? (p.endsWith('/') || p.endsWith('/index.html')) : (p.endsWith('/manifest.webmanifest') || p.includes('/assets/'));
    if (!esApp || !url.href.startsWith(self.registration.scope)) return;
    e.respondWith((async () => {
      const c = await caches.open(V);
      try {
        const r = await conLimite(req, 6000);
        if (r.ok) c.put(req, r.clone());
        return r;
      } catch (_) {
        return (await c.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? (await c.match('./index.html')) : null) || Response.error();
      }
    })());
    return;
  }
  if (ES_CDN.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const guardado = await c.match(req);
      const red = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; });
      if (guardado) { red.catch(() => {}); return guardado; }
      return red;
    })());
  }
});
