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

// Fetch: sadece http/https istekleri önbelleğe al
self.addEventListener("fetch", event => {
  const req = event.request;
  
  // Sadece GET istekleri
  if (req.method !== "GET") return;
  
  // Sadece http:// ve https:// şemaları
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  
  // Supabase API isteklerini önbelleğe alma
  if (req.url.includes("supabase.co")) return;
  
  event.respondWith(
    fetch(req)
      .then(response => {
        // Sadece başarılı istekleri cache'le
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => caches.match(req))
  );
});