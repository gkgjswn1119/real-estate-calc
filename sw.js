const CACHE = 'real-estate-calc-v8';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선 전략: 온라인이면 항상 최신 자산을 받아 캐시를 갱신하고,
// 네트워크 실패(오프라인) 시에만 캐시로 폴백한다.
// (기존 캐시 우선 전략은 배포 후에도 구버전 캐시를 계속 서빙해 업데이트가 안 되는
//  문제가 있어 전환함 — 캐시 버전 번호를 올려도 이미 활성화된 SW가 구버전을 유지했음)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
