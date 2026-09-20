/* Complete, same-origin release cache. Personal records are never cached here. */
const CACHE_NAME = 'lifeos-v78-private-workspace';
const RELEASE = 'v78';
const RELEASE_MANIFEST = './release-manifest.json';
const ASSETS_TO_CACHE = ['./','./index.html','./manifest.json','./life-app.css','./lifeos-planner.css','./life-app.js','./lifeos-storage.js','./db.js','./lifeos-purchases.js','./lifeos-planner.js','./lifeos-work-calendar.js', './lifeos-conductor.js','./lifeos-workspace.js','./lifeos-purchase-ui.js','./lifeos-planner-ui.js','./lifeos-writers.js','./lifeos-vault.js','./lifeos-runtime.js','./icon-192.png','./icon-512.png','./logo.svg','./release-manifest.json'];
const BASE = new URL('./', self.location.href);
const digest = async response => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
async function installRelease() {
  const existed = (await caches.keys()).includes(CACHE_NAME);
  try {
    const manifestResponse = await fetch(new URL(RELEASE_MANIFEST, BASE), { cache: 'no-store', credentials: 'same-origin' });
    if (!manifestResponse.ok) throw new Error('The complete release manifest is not available.');
    const manifest = await manifestResponse.clone().json();
    const assets = ASSETS_TO_CACHE.filter(asset => asset !== './' && asset !== RELEASE_MANIFEST);
    if (manifest.release !== RELEASE || !manifest.assets || Array.isArray(manifest.assets) || Object.keys(manifest.assets).length !== assets.length || assets.some(asset => !/^[a-f0-9]{64}$/.test(manifest.assets[asset] || ''))) throw new Error('The release manifest does not match this app version.');
    // Verify every response before writing any of the new release to its cache.
    const verified = await Promise.all(assets.map(async asset => {
      const response = await fetch(new URL(asset, BASE), { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok || await digest(response) !== manifest.assets[asset]) throw new Error('This release is incomplete or still updating: ' + asset);
      return [asset, response];
    }));
    const index = verified.find(([asset]) => asset === './index.html')[1].clone();
    const cache = await caches.open(CACHE_NAME);
    if (existed) {
      // A reused cache name must never overwrite a possibly active release.
      const prior = await cache.match(RELEASE_MANIFEST);
      const priorManifest = prior && await prior.json();
      if (!priorManifest || priorManifest.release !== RELEASE || assets.some(asset => priorManifest.assets?.[asset] !== manifest.assets[asset])) throw new Error('Changed releases need a new cache version.');
      await Promise.all(ASSETS_TO_CACHE.filter(asset => asset !== RELEASE_MANIFEST).map(async asset => {
        const response = await cache.match(asset);
        if (!response || await digest(response) !== manifest.assets[asset === './' ? './index.html' : asset]) throw new Error('The existing release cache is incomplete.');
      }));
    } else {
      await Promise.all(verified.map(([asset, response]) => cache.put(asset, response)));
      await cache.put('./', index.clone());
      await cache.put(RELEASE_MANIFEST, manifestResponse);
    }
    if (!self.registration.active) await self.skipWaiting();
  } catch (error) {
    if (!existed) await caches.delete(CACHE_NAME);
    throw error;
  }
}
self.addEventListener('install', event => {
  event.waitUntil(installRelease());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('lifeos-') && name !== CACHE_NAME).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    if (event.request.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === BASE.pathname + 'index.html')) return cache.match('./index.html');
    try { return await fetch(event.request); }
    catch (_) { return new Response('This file is unavailable offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  }));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
