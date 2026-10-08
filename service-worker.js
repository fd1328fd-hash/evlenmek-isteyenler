// ============================================================
// SERVICE WORKER — PWA için önbellekleme
// ============================================================
const CACHE_NAME = "evlenmek-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./i18n.js",
  "./manifest.json",
  "./favicon.svg"
];

// Kurulum: dosyaları önbelleğe al
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => console.log("Cache hatası:", err));
    })
  );
  self.skipWaiting();
});

// Aktivasyon: eski önbellekleri temizle
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: önce ağ, olmazsa önbellekten al
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  // Supabase API isteklerini önbelleğe alma
  if (event.request.url.includes("supabase.co")) return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});