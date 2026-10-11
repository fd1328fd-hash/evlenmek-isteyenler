// ============================================================
// ÇEREZ ONAY SİSTEMİ (KVKK / GDPR Uyumlu)
// ============================================================
const COOKIE_CONSENT_KEY = "gb_cookie_consent";
const COOKIE_CONSENT_VERSION = 1;

function getCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== COOKIE_CONSENT_VERSION) return null;
    return data;
  } catch(e) { return null; }
}

function saveCookieConsent(preferences) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      version: COOKIE_CONSENT_VERSION,
      preferences,
      timestamp: new Date().toISOString()
    }));
  } catch(e) {}
}

// Google Analytics'i dinamik olarak yükle
function loadGoogleAnalytics() {
  if (window._gaLoaded) return;
  window._gaLoaded = true;
  
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-EFYQ71B0YT";
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-EFYQ71B0YT', { anonymize_ip: true });
}

// Tercihlere göre çerezleri uygula
function applyConsentPreferences(preferences) {
  if (preferences.analytics) {
    loadGoogleAnalytics();
  }
}

// --- Banner ---
function createCookieBanner() {
  if (document.getElementById("cookieBanner")) return;
  
  const banner = document.createElement("div");
  banner.id = "cookieBanner";
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <div class="cookie-banner-inner">
      <div class="cookie-banner-text">
        <strong data-i18n="cookieTitle">🍪 Çerez Kullanımı</strong>
        <p data-i18n="cookieDesc">Deneyiminizi iyileştirmek ve siteyi geliştirmek için çerezler kullanıyoruz. Detaylar için Gizlilik Politikamızı inceleyebilirsiniz.</p>
      </div>
      <div class="cookie-banner-actions">
        <button type="button" class="cookie-btn cookie-btn-settings" data-action="open-cookie-settings" data-i18n="cookieSettings">Ayarlar</button>
        <button type="button" class="cookie-btn cookie-btn-reject" data-action="cookie-reject" data-i18n="cookieReject">Reddet</button>
        <button type="button" class="cookie-btn cookie-btn-accept" data-action="cookie-accept" data-i18n="cookieAccept">Kabul Et</button>
      </div>
    </div>`;
  document.body.appendChild(banner);
  
  setTimeout(() => banner.classList.add("show"), 100);
  
  if (typeof applyTranslations === "function") applyTranslations();
}

// --- Ayarlar Modalı ---
function createCookieSettingsModal() {
  if (document.getElementById("cookieSettingsModal")) return;
  
  const modal = document.createElement("div");
  modal.className = "overlay";
  modal.id = "cookieSettingsModal";
  modal.setAttribute("data-overlay", "");
  modal.innerHTML = `
    <div class="modal" style="width:min(560px,100%)">
      <button class="close-x" data-action="close-cookie-settings">✕</button>
      <h3 style="font-size:1.25rem;margin-bottom:8px" data-i18n="cookieSettingsTitle">Çerez Ayarları</h3>
      <p style="font-size:.86rem;color:var(--muted);margin-bottom:20px" data-i18n="cookieSettingsDesc">Hangi çerez türlerine izin vermek istediğinizi seçin.</p>
      
      <div class="cookie-category">
        <div class="cookie-category-info">
          <b data-i18n="cookieNecessary">Zorunlu Çerezler</b>
          <span data-i18n="cookieNecessaryDesc">Sitenin çalışması için gereklidir. Devre dışı bırakılamaz.</span>
        </div>
        <label class="switch"><input type="checkbox" checked disabled><span class="slider"></span></label>
      </div>
      
      <div class="cookie-category">
        <div class="cookie-category-info">
          <b data-i18n="cookieAnalytics">Analitik Çerezler</b>
          <span data-i18n="cookieAnalyticsDesc">Ziyaretçi istatistiklerini anonim olarak toplar.</span>
        </div>
        <label class="switch"><input type="checkbox" id="cookieOptAnalytics" checked><span class="slider"></span></label>
      </div>
      
      <div class="cookie-category">
        <div class="cookie-category-info">
          <b data-i18n="cookieMarketing">Pazarlama Çerezleri</b>
          <span data-i18n="cookieMarketingDesc">Size özel içerik ve reklam göstermek için kullanılır.</span>
        </div>
        <label class="switch"><input type="checkbox" id="cookieOptMarketing"><span class="slider"></span></label>
      </div>
      
      <button type="button" class="btn btn-primary btn-block" style="margin-top:20px" data-action="cookie-save-settings" data-i18n="cookieSave">Tercihlerimi Kaydet</button>
    </div>`;
  document.body.appendChild(modal);
  
  modal.addEventListener("click", e => { if (e.target === modal) closeCookieSettings(); });
  if (typeof applyTranslations === "function") applyTranslations();
}

function openCookieSettings() {
  createCookieSettingsModal();
  const modal = document.getElementById("cookieSettingsModal");
  const consent = getCookieConsent();
  if (consent) {
    const analytics = document.getElementById("cookieOptAnalytics");
    const marketing = document.getElementById("cookieOptMarketing");
    if (analytics) analytics.checked = !!consent.preferences.analytics;
    if (marketing) marketing.checked = !!consent.preferences.marketing;
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCookieSettings() {
  const modal = document.getElementById("cookieSettingsModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

// --- Aksiyonlar ---
function acceptAllCookies() {
  const prefs = { necessary: true, analytics: true, marketing: true };
  saveCookieConsent(prefs);
  applyConsentPreferences(prefs);
  hideCookieBanner();
  closeCookieSettings();
  if (typeof toast === "function" && typeof t === "function") {
    toast("✅ " + t("cookieAccepted"));
  }
}

function rejectAllCookies() {
  const prefs = { necessary: true, analytics: false, marketing: false };
  saveCookieConsent(prefs);
  applyConsentPreferences(prefs);
  hideCookieBanner();
  closeCookieSettings();
  if (typeof toast === "function" && typeof t === "function") {
    toast("✅ " + t("cookieRejected"));
  }
}

function saveCustomCookieSettings() {
  const analytics = document.getElementById("cookieOptAnalytics")?.checked || false;
  const marketing = document.getElementById("cookieOptMarketing")?.checked || false;
  const prefs = { necessary: true, analytics, marketing };
  saveCookieConsent(prefs);
  applyConsentPreferences(prefs);
  hideCookieBanner();
  closeCookieSettings();
  if (typeof toast === "function" && typeof t === "function") {
    toast("✅ " + t("cookieSaved"));
  }
}

function hideCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (banner) {
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 400);
  }
}

// --- Başlatma ---
function initCookieConsent() {
  const consent = getCookieConsent();
  if (consent) {
    // Zaten tercih vermiş → direkt uygula, banner gösterme
    applyConsentPreferences(consent.preferences);
  } else {
    // İlk ziyaret → banner göster
    createCookieBanner();
  }
}

// Event delegation
document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  if (action === "cookie-accept") { e.preventDefault(); acceptAllCookies(); }
  else if (action === "cookie-reject") { e.preventDefault(); rejectAllCookies(); }
  else if (action === "open-cookie-settings") { e.preventDefault(); openCookieSettings(); }
  else if (action === "close-cookie-settings") { e.preventDefault(); closeCookieSettings(); }
  else if (action === "cookie-save-settings") { e.preventDefault(); saveCustomCookieSettings(); }
});

// Sayfa hazır olunca başlat (biraz gecikmeyle, i18n yüklensin diye)
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initCookieConsent, 600);
});