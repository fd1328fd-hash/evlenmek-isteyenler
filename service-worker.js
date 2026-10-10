// ============================================================
// SERVICE WORKER — PWA için önbellekleme + Push Bildirimleri
// ============================================================
const CACHE_NAME = "evlenmek-v3";
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

  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (req.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(req)
      .then(response => {
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

// Push Bildirimleri
self.addEventListener("push", event => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch(e) {
    data = { title: "Evlenmek İsteyenler", body: event.data.text() };
  }
  const options = {
    body: data.body || "Yeni bir bildiriminiz var!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Evlenmek İsteyenler", options)
  );
});

// Bildirime tıklama
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});