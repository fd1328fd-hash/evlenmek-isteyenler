// ============================================================
// SUPABASE BAĞLANTISI
// ============================================================
const SUPABASE_URL = "https://mrlyghqqyvrdcwwmhpwj.supabase.co";
const SUPABASE_KEY = "sb_publishable_EW46ECy6Lv4Z1qJ_UPPx1A_JbU3G_rG";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const GRADS = ["linear-gradient(135deg,#e8437c,#c72c63)","linear-gradient(135deg,#6d3b8f,#9b5fc0)","linear-gradient(135deg,#2e9e8f,#1f7a6e)","linear-gradient(135deg,#e08c2e,#c06a12)","linear-gradient(135deg,#3b7dd8,#2a5aa0)","linear-gradient(135deg,#d84a6b,#a52e4d)","linear-gradient(135deg,#5a4bd8,#3f32a8)","linear-gradient(135deg,#0f9b8e,#0a6f66)"];
const grad = id => { let h = 0; for (let i = 0; i < (id || "").length; i++) h = (h + id.charCodeAt(i)) % GRADS.length; return GRADS[h]; };
const initials = n => String(n || "?").trim().split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

const VAPID_PUBLIC_KEY = "BN94KvdXeVAtBGJ1ES0sohLNsmCiYTFTIIar0RIeHwhymsIPiIEMwg4RWQh2whmKpjAL9W4Cbf0KrN56RUvNPjM";

let currentUser = null, myProfile = null, myLikes = new Set(), myBlocks = new Set(), allProfiles = [], unreadCount = 0;
let activeConvUserId = null, realtimeChannel = null, typingChannel = null, allUsers = {}, pendingImage = null;
let pendingPhotos = [null, null, null, null];
let reportingUserId = null;
let myNotifications = [], notificationChannel = null, unreadNotifCount = 0;
let isAdminUser = false;
let convStatusInterval = null;
let deferredPrompt = null;

function toast(msg, ms = 3500) {
  const el = $("#toast");
  el.innerHTML = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), ms);
}

function savePendingProfile(d) { try { localStorage.setItem("gb_pending_profile", JSON.stringify(d)); } catch(e) {} }
function getPendingProfile() { try { const r = localStorage.getItem("gb_pending_profile"); return r ? JSON.parse(r) : null; } catch(e) { return null; } }
function clearPendingProfile() { try { localStorage.removeItem("gb_pending_profile"); } catch(e) {} }

async function applyPendingProfile() {
  if (!currentUser) return;
  const pending = getPendingProfile();
  if (!pending || pending._userId !== currentUser.id) return;
  const { data: existing } = await db.from("profiles").select("id").eq("id", currentUser.id).maybeSingle();
  if (existing) { clearPendingProfile(); return; }
  const { _userId, ...profileData } = pending;
  profileData.interests = profileData.interests || [];
  const { error } = await db.from("profiles").insert({ id: currentUser.id, ...profileData });
  if (!error) {
    clearPendingProfile();
    myProfile = { ...profileData, id: currentUser.id };
    toast(`✅ ${t("welcomeToast")} ${String(profileData.name).split(" ")[0]}! 🎉`, 5000);
    loadProfiles();
  }
}

const TR_CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir","Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"];
const COUNTRY_CODES = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR IO VG BN BG BF BI KH CM CA CV BQ KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF KP MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA KR SS ES LK BL SH KN LC MF PM VC SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VA VE VN WF EH YE ZM ZW".split(" ");
const dnTr = new Intl.DisplayNames(["tr"], { type: "region" });
const dnEn = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = COUNTRY_CODES.map(c => ({ tr: dnTr.of(c), en: dnEn.of(c) })).sort((a, b) => a.tr.localeCompare(b.tr, "tr"));
const TR_TO_EN = Object.fromEntries(COUNTRIES.map(c => [c.tr, c.en]));
const API_ALIAS = { "Türkiye": "Turkey", "Czechia": "Czech Republic", "Côte d’Ivoire": "Cote d'Ivoire", "Congo - Kinshasa": "Democratic Republic of the Congo", "Congo - Brazzaville": "Congo", "Myanmar (Burma)": "Myanmar", "North Macedonia": "Macedonia", "Eswatini": "Swaziland", "Hong Kong SAR China": "Hong Kong", "Macao SAR China": "Macau", "Palestinian Territories": "Palestine", "Vatican City": "Vatican City State" };
const LEGACY_COUNTRY = { "ABD": "Amerika Birleşik Devletleri", "BAE": "Birleşik Arap Emirlikleri", "İngiltere": "Birleşik Krallık" };
const normCountry = c => LEGACY_COUNTRY[c] || c;

const cityCache = {};
async function getCities(countryTr) {
  if (countryTr === "Türkiye") return TR_CITIES;
  if (cityCache[countryTr]) return cityCache[countryTr];
  const en = TR_TO_EN[countryTr] || countryTr;
  try {
    const r = await fetch("https://countriesnow.space/api/v0.1/countries/cities", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: API_ALIAS[en] || en })
    });
    const j = await r.json();
    const list = j.error ? [] : [...new Set(j.data || [])].sort((a, b) => a.localeCompare(b));
    if (list.length) cityCache[countryTr] = list;
    return list;
  } catch (e) { return []; }
}

function fillCountriesAndCities() {
  const opts = COUNTRIES.map(c => `<option value="${esc(c.tr)}">${esc(c.tr)}</option>`).join("");
  ["#r-country", "#e-country"].forEach(sel => {
    const el = $(sel); if (!el) return;
    el.innerHTML = '<option value="" data-i18n-opt="select">Seçiniz</option>' + opts;
  });
  const f = $("#f-country");
  if (f) f.innerHTML = '<option value="hepsi" data-i18n-opt="all">Tümü</option>' + opts;
}

async function updateCityDropdown(countrySelId, citySelId) {
  const country = $("#" + countrySelId).value;
  const dl = $("#dl-" + citySelId);
  if (!dl) return;
  dl.innerHTML = "";
  if (!country || country === "hepsi") return;
  const cities = await getCities(country);
  if ($("#" + countrySelId).value !== country) return;
  dl.innerHTML = cities.map(c => `<option value="${esc(c)}">`).join("");
}

function setupAgeSlider() {
  const minSlider = $("#q-min");
  const maxSlider = $("#q-max");
  const fill = $("#rangeFill");
  const minVal = $("#ageMinVal");
  const maxVal = $("#ageMaxVal");
  if (!minSlider || !maxSlider || !fill) return;
  const MIN = 18, MAX = 99;
  function update() {
    let lo = +minSlider.value;
    let hi = +maxSlider.value;
    if (lo > hi - 1) {
      if (document.activeElement === minSlider) { minSlider.value = hi - 1; lo = hi - 1; }
      else { maxSlider.value = lo + 1; hi = lo + 1; }
    }
    const leftPct = ((lo - MIN) / (MAX - MIN)) * 100;
    const rightPct = ((hi - MIN) / (MAX - MIN)) * 100;
    fill.style.left = leftPct + "%";
    fill.style.width = (rightPct - leftPct) + "%";
    if (minVal) minVal.textContent = lo;
    if (maxVal) maxVal.textContent = hi;
  }
  minSlider.addEventListener("input", update);
  maxSlider.addEventListener("input", update);
  update();
}

function openModal(id) { const el = $("#" + id); if (el) { el.classList.add("open"); document.body.style.overflow = "hidden"; } }
function closeModal(id) { const el = $("#" + id); if (el) el.classList.remove("open"); document.body.style.overflow = ""; }
function closeAllModals() { $$(".overlay").forEach(o => o.classList.remove("open")); document.body.style.overflow = ""; }

// ============================================================
// BAN KONTROLÜ
// ============================================================
async function checkIfBanned(userId) {
  try {
    const { data, error } = await db.from("profiles").select("is_banned").eq("id", userId).maybeSingle();
    if (error) { console.error("Ban kontrol hatası:", error); return false; }
    return data?.is_banned === true;
  } catch(e) {
    console.error("Ban kontrol exception:", e);
    return false;
  }
}

async function forceLogoutIfBanned() {
  if (!currentUser) return false;
  const banned = await checkIfBanned(currentUser.id);
  if (banned) {
    await db.auth.signOut();
    currentUser = null; myProfile = null;
    closeAllModals();
    updateNavbar(); updateProfileSection(); updateHeroBoxes();
    toast("⛔ Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.", 10000);
    return true;
  }
  return false;
}

async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;

    if (await checkIfBanned(currentUser.id)) {
      await db.auth.signOut();
      currentUser = null; myProfile = null;
      updateNavbar(); updateProfileSection(); updateHeroBoxes();
      toast("⛔ Hesabınız askıya alınmıştır.", 10000);
      return;
    }

    const { data: adminCheck } = await db.from("admins").select("user_id").eq("user_id", currentUser.id).maybeSingle();
    isAdminUser = !!adminCheck;

    await loadMyProfile();
    await applyPendingProfile();
    await loadMyLikes();
    await loadMyBlocks();
    await initRealtime();
    await initTypingChannel();
    await initNotificationRealtime();
    await refreshUnreadCount();
    await loadNotifications();
    await updateLastSeen();
    await requestNotificationPermission();
  }
  updateNavbar();
  updateProfileSection();
  updateHeroBoxes();
}

async function loadMyProfile() {
  const { data } = await db.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
  myProfile = data;
}
async function loadMyLikes() {
  const { data } = await db.from("likes").select("liked_id").eq("liker_id", currentUser.id);
  myLikes = new Set((data || []).map(x => x.liked_id));
}
async function loadMyBlocks() {
  if (!currentUser) { myBlocks = new Set(); return; }
  const { data } = await db.from("blocks").select("blocked_id").eq("blocker_id", currentUser.id);
  myBlocks = new Set((data || []).map(x => x.blocked_id));
}

// ============================================================
// SON GÖRÜLME
// ============================================================
async function updateLastSeen() {
  if (!currentUser) return;
  try {
    await db.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", currentUser.id);
  } catch(e) {}
}

function parseLastSeenUTC(iso) {
  if (!iso) return 0;
  let str = String(iso).trim();
  if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str.replace(" ", "T") + "Z";
  }
  return new Date(str).getTime();
}

function formatLastSeen(iso) {
  if (!iso) return { text: t("offline"), online: false };
  const diff = (Date.now() - parseLastSeenUTC(iso)) / 1000;

  if (diff < 120) return { text: t("onlineNow"), online: true };
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return { text: `${m} ${t("minAgo")} aktifti`, online: false };
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return { text: `${h} ${t("hourAgo")} aktifti`, online: false };
  }
  const days = Math.floor(diff / 86400);
  if (days === 1) return { text: `${t("yesterday")} aktifti`, online: false };
  if (days < 30) return { text: `${days} ${t("dayAgo")} aktifti`, online: false };
  if (days < 365) {
    const m = Math.floor(days / 30);
    return { text: `${m} ${t("monthAgo")} aktifti`, online: false };
  }
  const y = Math.floor(days / 365);
  return { text: `${y} ${t("yearAgo")} aktifti`, online: false };
}

// ============================================================
// BİLDİRİMLER
// ============================================================
async function loadNotifications() {
  if (!currentUser) return;
  const { data } = await db.from("notifications")
    .select("*").eq("user_id", currentUser.id)
    .order("created_at", { ascending: false }).limit(80);
  myNotifications = data || [];
  unreadNotifCount = myNotifications.filter(n => !n.is_read).length;
  const actorIds = [...new Set(myNotifications.map(n => n.actor_id))].filter(id => !allUsers[id]);
  if (actorIds.length) {
    const { data: profs } = await db.from("profiles").select("*").in("id", actorIds);
    (profs || []).forEach(p => allUsers[p.id] = p);
  }
  updateNavbar();
  renderNotifications();
}

function renderNotifications() {
  const el = $("#notifList");
  if (!el) return;
  if (!myNotifications.length) {
    el.innerHTML = `<div class="empty" style="border:none;padding:40px 20px;font-size:.9rem">${t("noNotifications")}</div>`;
    return;
  }
  el.innerHTML = myNotifications.map(n => {
    const actor = allUsers[n.actor_id] || { name: "?" };
    const avStyle = actor.avatar_url ? `background:url('${esc(actor.avatar_url)}') center/cover` : `background:${grad(n.actor_id)}`;
    const avContent = actor.avatar_url ? "" : initials(actor.name);
    let text = "";
    if (n.type === "message") text = `<b>${esc(actor.name)}</b> ${t("notifMessage")}: "${esc((n.content || "").slice(0, 40))}"`;
    else if (n.type === "favorite") text = `⭐ <b>${esc(actor.name)}</b> ${t("notifFavorite")}`;
    else if (n.type === "view") text = `👀 <b>${esc(actor.name)}</b> ${t("notifView")}`;
    const time = formatTime(n.created_at);
    const unreadClass = !n.is_read ? "notif-unread" : "";
    const dot = !n.is_read ? '<div class="notif-dot"></div>' : "";
    return `<div class="notif-item ${unreadClass}" data-action="open-notif" data-id="${n.id}" data-actor="${n.actor_id}" data-type="${n.type}">
      <div class="avatar" style="${avStyle};width:44px;height:44px;border-radius:12px;font-size:.85rem;flex-shrink:0">${avContent}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.88rem;line-height:1.4">${text}</div>
        <div style="font-size:.75rem;color:var(--muted);margin-top:3px">${time}</div>
      </div>
      ${dot}
    </div>`;
  }).join("");
}

async function openNotification(id, actorId, type) {
  await db.from("notifications").update({ is_read: true }).eq("id", id);
  const n = myNotifications.find(x => String(x.id) === String(id));
  if (n) n.is_read = true;
  unreadNotifCount = myNotifications.filter(x => !x.is_read).length;
  updateNavbar();
  renderNotifications();
  closeModal("notificationsModal");
  if (type === "message") await startChatWith(actorId);
  else await viewProfile(actorId);
}

async function markAllRead() {
  if (!currentUser) return;
  await db.from("notifications").update({ is_read: true }).eq("user_id", currentUser.id).eq("is_read", false);
  myNotifications.forEach(n => n.is_read = true);
  unreadNotifCount = 0;
  updateNavbar();
  renderNotifications();
}

function initNotificationRealtime() {
  if (!currentUser) return;
  if (notificationChannel) db.removeChannel(notificationChannel);
  notificationChannel = db.channel("notifications-rt")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUser.id}` }, async payload => {
      const notif = payload.new;
      if (!allUsers[notif.actor_id]) {
        const { data } = await db.from("profiles").select("*").eq("id", notif.actor_id).single();
        if (data) allUsers[notif.actor_id] = data;
      }
      myNotifications.unshift(notif);
      unreadNotifCount++;
      updateNavbar();
      renderNotifications();
      const actor = allUsers[notif.actor_id] || { name: "Birisi" };
      let msg = "";
      if (notif.type === "message") msg = `💬 <b>${esc(actor.name)}</b> ${t("notifMessage")}`;
      else if (notif.type === "favorite") msg = `⭐ <b>${esc(actor.name)}</b> ${t("notifFavorite")}`;
      else if (notif.type === "view") msg = `👀 <b>${esc(actor.name)}</b> ${t("notifView")}`;
      if (msg) toast(msg, 4500);
    })
    .subscribe();
}

function updateNavbar() {
  const nav = $("#navActions");
  if (!nav) return;
  if (currentUser && myProfile) {
    const isAdmin = isAdminUser;
    const badge = unreadCount > 0 ? `<span class="badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : "";
    const notifBadge = unreadNotifCount > 0 ? `<span class="badge">${unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>` : "";
    const avStyle = myProfile.avatar_url ? `background:url('${esc(myProfile.avatar_url)}') center/cover` : `background:${grad(currentUser.id)}`;
    const avContent = myProfile.avatar_url ? "" : initials(myProfile.name);
    const adminTag = isAdmin ? `<span class="admin-tag">ADMIN</span>` : "";
    nav.innerHTML = `
      <button class="icon-btn" data-action="open-notifications" title="${t("notifications")}">🔔${notifBadge}</button>
      <button class="icon-btn" data-action="open-messages" title="${t("messages")}">💬${badge}</button>
      <div class="user-menu">
        <button class="user-menu-btn" data-action="toggle-user-menu">
          <div class="avatar" style="${avStyle}">${avContent}</div>
          <span class="user-menu-name hide-mobile">${esc(myProfile.name)}${adminTag}</span>
          <span class="user-menu-caret">▼</span>
        </button>
        <div class="user-menu-dropdown" id="userMenuDropdown">
          <button data-action="open-my-profile">👤 ${t("myProfileTitle")}</button>
          <button data-action="open-my-favorites">❤️ ${t("myFavorites")}</button>
          <button data-action="open-account">⚙️ ${t("accountSettings")}</button>
          ${isAdmin ? `<a href="admin.html" class="user-menu-link">🛡️ Admin Panel</a>` : ""}
          <button data-action="logout" class="user-menu-logout">🚪 ${t("logout")}</button>
        </div>
      </div>`;
  } else if (currentUser && !myProfile) {
    nav.innerHTML = `<button class="btn btn-ghost btn-sm" data-action="logout">${t("logout")}</button>`;
  } else {
    nav.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-action="open-login">${t("login")}</button>
      <button class="btn btn-primary btn-sm" data-action="open-register">${t("signup")}</button>`;
  }
}

function updateHeroBoxes() {
  const isLoggedIn = !!(currentUser && myProfile);
  const heroSection = document.querySelector(".hero");
  const profillerSection = document.getElementById("profiller");
  if (heroSection) heroSection.style.display = isLoggedIn ? "none" : "";
  if (profillerSection) profillerSection.style.paddingTop = isLoggedIn ? "30px" : "";
}

function updateProfileSection() {
  const filterPanel = $("#filterPanel");
  const grid = $("#profileGrid");
  if (!filterPanel || !grid) return;
  if (!currentUser || !myProfile) {
    filterPanel.style.display = "none";
    grid.innerHTML = `
      <div class="locked-screen">
        <span class="locked-icon">🔒</span>
        <h3>${t("lockedTitle")}</h3>
        <p>${t("lockedDesc")}</p>
        <div class="locked-features">
          <span class="locked-feature">${t("featureUnlimited")}</span>
          <span class="locked-feature">${t("featureMessaging")}</span>
          <span class="locked-feature">${t("featureImages")}</span>
          <span class="locked-feature">${t("featurePhoto")}</span>
          <span class="locked-feature">${t("featureWorldwide")}</span>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" data-action="open-register">${t("freeSignup")}</button>
          <button class="btn btn-ghost" data-action="open-login">${t("loginShort")}</button>
        </div>
      </div>`;
    const pc = $("#profileCount"); if (pc) pc.textContent = t("lockedTitle");
    return;
  }
  filterPanel.style.display = "block";
}

async function initRealtime() {
  if (!currentUser) return;
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel("messages-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${currentUser.id}` }, payload => {
      const msg = payload.new;
      if (myBlocks.has(msg.sender_id)) return;
      if (activeConvUserId === msg.sender_id) {
        appendMessage(msg, true);
        db.from("messages").update({ is_read: true }).eq("id", msg.id).then(() => {});
      }
      refreshUnreadCount();
      refreshConversationList();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${currentUser.id}` }, () => { refreshConversationList(); })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, payload => {
      const delId = payload.old.id;
      if (delId) { const el = document.querySelector(`.msg[data-msg-id="${delId}"]`); if (el) el.remove(); }
      refreshConversationList();
    })
    .subscribe();
}

// ============================================================
// "YAZIYOR..." KANALI (Ayrı Broadcast Kanalı)
// ============================================================
function initTypingChannel() {
  if (!currentUser) return;
  if (typingChannel) db.removeChannel(typingChannel);
  typingChannel = db.channel("typing-broadcast", {
    config: { broadcast: { self: false, ack: false } }
  })
  .on("broadcast", { event: "typing" }, (payload) => {
    const data = payload.payload || payload;
    if (data.user_id !== currentUser.id && activeConvUserId === data.user_id) {
      showTypingIndicator(data.user_id);
    }
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") console.log("✅ Typing kanalı hazır");
  });
}

async function refreshUnreadCount() {
  if (!currentUser) return;
  const { count } = await db.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", currentUser.id).eq("is_read", false);
  unreadCount = count || 0;
  updateNavbar();
}

function avatarHtml(p) {
  if (p.avatar_url) return `<div class="avatar" style="background:url('${esc(p.avatar_url)}') center/cover"></div>`;
  return `<div class="avatar" style="background:${grad(p.id)}">${initials(p.name)}</div>`;
}

async function loadProfiles(filters = {}) {
  if (!currentUser || !myProfile) { updateProfileSection(); return; }
  const grid = $("#profileGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="empty">⏳ ${t("loading")}</div>`;
  let q = db.from("profiles").select("*").order("created_at", { ascending: false });
  if (myProfile && myProfile.gender) {
    const opposite = myProfile.gender === "kadın" ? "erkek" : "kadın";
    q = q.eq("gender", opposite);
  }
  if (filters.country && filters.country !== "hepsi") {
    const olds = Object.keys(LEGACY_COUNTRY).filter(k => LEGACY_COUNTRY[k] === filters.country);
    if (olds.length) q = q.in("country", [filters.country, ...olds]);
    else q = q.eq("country", filters.country);
  }
  if (filters.city && filters.city !== "hepsi") q = q.ilike("city", filters.city.replace(/[%_]/g, ""));
  if (filters.marital && filters.marital !== "hepsi") q = q.eq("marital_status", filters.marital);
  if (filters.education && filters.education !== "hepsi") q = q.eq("education", filters.education);
  if (filters.ageMin) q = q.gte("age", filters.ageMin);
  if (filters.ageMax) q = q.lte("age", filters.ageMax);
  if (filters.heightMin) q = q.gte("height", filters.heightMin);
  if (filters.heightMax) q = q.lte("height", filters.heightMax);
  if (filters.weightMin) q = q.gte("weight", filters.weightMin);
  if (filters.weightMax) q = q.lte("weight", filters.weightMax);
  const { data, error } = await q.limit(100);
  if (error) { grid.innerHTML = `<div class="empty"><b>Hata</b>${esc(error.message)}</div>`; return; }
  let list = data || [];
  list = list.filter(p => p.id !== currentUser.id && !myBlocks.has(p.id));
  if (filters.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(p => (p.name || "").toLowerCase().includes(s) || (p.job || "").toLowerCase().includes(s) || (p.city || "").toLowerCase().includes(s));
  }
  allProfiles = list;
  list.forEach(p => allUsers[p.id] = p);
  if (!list.length) {
    grid.innerHTML = `<div class="empty"><b>${t("noMembers")}</b></div>`;
    const pc = $("#profileCount"); if (pc) pc.textContent = `0 ${t("membersFound")}`;
    return;
  }
  const pc = $("#profileCount"); if (pc) pc.textContent = `${list.length} ${t("membersFound")}`;
  grid.innerHTML = list.map(p => {
    const favorited = myLikes.has(p.id);
    const ls = formatLastSeen(p.last_seen);
    const infoPills = [];
    if (p.marital_status) infoPills.push(`<span class="info-pill ${p.marital_status === "Boşanmış" ? "rose" : ""}">${esc(p.marital_status)}</span>`);
    if (p.height) infoPills.push(`<span class="info-pill">${p.height} cm</span>`);
    if (p.weight) infoPills.push(`<span class="info-pill">${p.weight} kg</span>`);
    if (p.education) infoPills.push(`<span class="info-pill">${esc(p.education)}</span>`);
    return `<article class="profile-card">
      <div class="card-top">
        ${avatarHtml(p)}
        <div style="min-width:0;flex:1">
          <h4>${esc(p.name)}, ${p.age}</h4>
          <div class="meta">${esc(p.job || "—")} · ${esc(p.city)}${p.country && p.country !== "Türkiye" ? ", " + esc(p.country) : ""}</div>
          <div class="last-seen ${ls.online ? "online" : ""}" style="margin-top:4px"><span class="dot"></span>${ls.text}</div>
        </div>
      </div>
      <div class="info-row">${infoPills.join("")}</div>
      <p class="bio">${esc(p.bio || "—")}</p>
      <div class="tags">${(p.interests || []).slice(0, 3).map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-action="view-profile" data-id="${p.id}" style="flex:1">${t("profileBtn")}</button>
        <button class="like-btn ${favorited ? "liked" : ""}" data-action="toggle-like" data-id="${p.id}" title="${favorited ? t("favoriteRemove") : t("favoriteAdd")}">${favorited ? "♥" : "♡"}</button>
        <button class="like-btn" data-action="start-chat" data-id="${p.id}" title="${t("messageBtn")}">💬</button>
      </div>
    </article>`;
  }).join("");
}

async function handleRegister(e) {
  e.preventDefault();
  const termsCheckbox = $("#registerTerms");
  if (!termsCheckbox || !termsCheckbox.checked) {
    toast("⚠️ Lütfen Kullanıcı Sözleşmesi, Gizlilik Politikası ve KVKK metinlerini okuyup kabul edin.");
    return;
  }
  const fd = new FormData(e.target); const data = Object.fromEntries(fd);
  data.age = Number(data.age);
  data.height = data.height ? Number(data.height) : null;
  data.weight = data.weight ? Number(data.weight) : null;
  data.interests = (data.interests || "").split(",").map(s => s.trim()).filter(Boolean);
  const password = data.password; delete data.password;
  if (!data.name || !data.email || !data.age || !data.gender || !data.city || !data.country) { toast(t("fillRequired")); return; }
  if (data.age < 18) { toast(t("only18")); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { toast(t("invalidEmail")); return; }
  if (password.length < 6) { toast(t("passwordShort")); return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "…";
  const { data: authData, error: authErr } = await db.auth.signUp({ email: data.email, password, options: { emailRedirectTo: window.location.origin } });
  if (authErr) {
    btn.disabled = false; btn.textContent = t("createMyAccount");
    let msg = authErr.message;
    if (msg.includes("already registered")) msg = t("emailRegistered");
    toast("Hata: " + msg); return;
  }
  const userId = authData.user.id;
  const profileData = { name: data.name, age: data.age, gender: data.gender, country: data.country || "Türkiye", city: data.city, job: data.job || "", bio: data.bio || "", marital_status: data.marital_status || "Bekar", height: data.height, weight: data.weight, education: data.education || "", interests: data.interests, photos: [], last_seen: new Date().toISOString() };
  if (!authData.session) {
    savePendingProfile({ _userId: userId, ...profileData });
    btn.disabled = false; btn.textContent = t("createMyAccount");
    e.target.reset(); closeAllModals();
    toast(t("registerSuccess"), 9000);
    return;
  }
  const { error: profErr } = await db.from("profiles").insert({ id: userId, ...profileData });
  if (profErr) {
    btn.disabled = false; btn.textContent = t("createMyAccount");
    toast("Hata: " + profErr.message); return;
  }
  currentUser = authData.user;
  myProfile = { ...profileData, id: userId };
  myLikes = new Set(); myBlocks = new Set();
  closeAllModals();
  updateNavbar(); updateProfileSection(); updateHeroBoxes();
  await initRealtime(); initTypingChannel(); initNotificationRealtime(); await loadNotifications();
  loadProfiles();
  toast(`🎉 ${t("welcomeToast")} ${data.name.split(" ")[0]}!`);
  await requestNotificationPermission();
}

async function handleLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get("email"), password = fd.get("password");
  const remember = fd.get("remember") === "on";
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "…";
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = t("login");
  if (error) {
    let msg = error.message;
    if (msg.includes("Email not confirmed")) msg = t("emailNotConfirmed");
    else if (msg.includes("Invalid login")) msg = t("invalidLogin");
    toast("Hata: " + msg); return;
  }

  currentUser = data.user;

  if (await checkIfBanned(currentUser.id)) {
    await db.auth.signOut();
    currentUser = null;
    myProfile = null;
    closeAllModals();
    updateNavbar(); updateProfileSection(); updateHeroBoxes();
    toast("⛔ Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.", 10000);
    return;
  }

  if (remember) {
    localStorage.setItem("gb_remembered_email", email);
  } else {
    localStorage.removeItem("gb_remembered_email");
  }

  const { data: adminCheck } = await db.from("admins").select("user_id").eq("user_id", currentUser.id).maybeSingle();
  isAdminUser = !!adminCheck;

  await loadMyProfile(); await applyPendingProfile(); await loadMyLikes(); await loadMyBlocks();
  await updateLastSeen();
  await initRealtime(); await initTypingChannel(); await initNotificationRealtime();
  await refreshUnreadCount(); await loadNotifications();
  closeAllModals();
  updateNavbar(); updateProfileSection(); updateHeroBoxes(); loadProfiles();
  toast(t("loginSuccess"));
  await requestNotificationPermission();
}

async function handleLogout() {
  if (currentUser) {
    try {
      await db.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", currentUser.id);
    } catch(e) {}
  }
  if (realtimeChannel) { db.removeChannel(realtimeChannel); realtimeChannel = null; }
  if (typingChannel) { db.removeChannel(typingChannel); typingChannel = null; }
  if (notificationChannel) { db.removeChannel(notificationChannel); notificationChannel = null; }
  await db.auth.signOut();
  currentUser = null; myProfile = null; myLikes = new Set(); myBlocks = new Set(); unreadCount = 0;
  myNotifications = []; unreadNotifCount = 0;
  activeConvUserId = null;
  isAdminUser = false;
  if (convStatusInterval) { clearInterval(convStatusInterval); convStatusInterval = null; }
  cancelPendingImage(); cancelPendingPhotos();
  closeMessages();
  updateNavbar(); updateProfileSection(); updateHeroBoxes();
  toast(t("logoutDone"));
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = new FormData(e.target).get("email");
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "…";
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  btn.disabled = false; btn.textContent = t("sendResetLink");
  if (error) { toast("Hata: " + error.message); return; }
  closeModal("forgotPasswordModal");
  e.target.reset();
  toast(t("resetEmailSent"), 8000);
}

async function handleResetPassword(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const password = fd.get("password"), password2 = fd.get("password2");
  if (password !== password2) { toast(t("passwordMismatch")); return; }
  if (password.length < 6) { toast(t("passwordShort")); return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "…";
  const { error } = await db.auth.updateUser({ password });
  btn.disabled = false; btn.textContent = t("saveNewPassword");
  if (error) { toast("Hata: " + error.message); return; }
  closeModal("resetPasswordModal");
  e.target.reset();
  toast(t("passwordUpdated"), 5000);
  if (window.location.hash.includes("type=recovery")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

async function toggleBlock(userId) {
  if (!currentUser || !myProfile) return;
  if (currentUser.id === userId) return;
  if (myBlocks.has(userId)) {
    if (!confirm(t("unblockConfirm"))) return;
    const { error } = await db.from("blocks").delete().eq("blocker_id", currentUser.id).eq("blocked_id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    myBlocks.delete(userId);
    toast(t("userUnblocked"));
  } else {
    if (!confirm(t("blockConfirm"))) return;
    const { error } = await db.from("blocks").insert({ blocker_id: currentUser.id, blocked_id: userId });
    if (error) { toast("Hata: " + error.message); return; }
    myBlocks.add(userId);
    toast(t("userBlocked"));
  }
  closeModal("detailModal");
  loadProfiles(getCurrentFilters());
  refreshConversationList();
}

function openReportModal(userId) {
  if (!currentUser) return;
  reportingUserId = userId;
  const form = $("#reportForm");
  if (form) form.reset();
  closeModal("detailModal");
  openModal("reportModal");
}

async function handleReport(e) {
  e.preventDefault();
  if (!currentUser || !reportingUserId) return;
  const fd = new FormData(e.target);
  const reason = fd.get("reason");
  const description = (fd.get("description") || "").trim();
  if (!reason) { toast(t("reportSelectReason")); return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "…";
  const { error } = await db.from("reports").insert({ reporter_id: currentUser.id, reported_id: reportingUserId, reason, description });
  btn.disabled = false; btn.textContent = t("reportSend");
  if (error) { toast("Hata: " + error.message); return; }
  closeModal("reportModal");
  e.target.reset();
  reportingUserId = null;
  toast(t("reportSent"), 5000);
}

// ============================================================
// RESİM SIKIŞTIRMA
// ============================================================
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (file.size < 200 * 1024) { resolve(file); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("Sıkıştırma başarısız")); return; }
          const ext = file.name.split(".").pop() || "jpg";
          const newFile = new File([blob], `compressed.${ext}`, { type: "image/jpeg" });
          resolve(newFile);
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Resim yüklenemedi"));
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
  });
}

// ============================================================
// FOTOĞRAF GRID YÖNETİMİ
// ============================================================
function renderPhotoGrid() {
  const grid = $("#photoGrid");
  if (!grid) return;
  const slots = grid.querySelectorAll(".photo-slot");
  slots.forEach((slot, i) => {
    const preview = slot.querySelector(".preview");
    const removeBtn = slot.querySelector(".photo-remove");
    const photo = pendingPhotos[i];
    if (photo && photo.url) {
      preview.style.background = `url('${photo.url}') center/cover`;
      preview.textContent = "";
      slot.classList.add("has-photo");
      if (removeBtn) removeBtn.style.display = "grid";
    } else {
      preview.style.background = "";
      preview.textContent = "";
      slot.classList.remove("has-photo");
      if (removeBtn) removeBtn.style.display = "none";
    }
  });
  const uploadBtn = $("#editPhotoUploadBtn");
  if (uploadBtn) {
    const hasEmpty = pendingPhotos.some(p => !p);
    uploadBtn.style.display = hasEmpty ? "inline-flex" : "none";
  }
}

function handleEditPhotoPick(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast(t("imageTooBig")); e.target.value = ""; return; }
  if (!file.type.startsWith("image/")) { toast(t("pickImage")); e.target.value = ""; return; }

  const emptyIndex = pendingPhotos.findIndex(p => !p);
  if (emptyIndex === -1) { toast("En fazla 4 fotoğraf ekleyebilirsiniz."); e.target.value = ""; return; }

  const url = URL.createObjectURL(file);
  pendingPhotos[emptyIndex] = { file, url };
  renderPhotoGrid();
  e.target.value = "";
}

function cancelPendingPhotos() {
  pendingPhotos.forEach(p => { if (p && p.url && !p.existing) URL.revokeObjectURL(p.url); });
  pendingPhotos = [null, null, null, null];
  renderPhotoGrid();
}

function removePhotoAtSlot(index) {
  if (pendingPhotos[index] && pendingPhotos[index].url && !pendingPhotos[index].existing) {
    URL.revokeObjectURL(pendingPhotos[index].url);
  }
  pendingPhotos[index] = null;
  renderPhotoGrid();
}

function openEditProfile() {
  if (!currentUser || !myProfile) return;
  cancelPendingPhotos();
  const existingPhotos = Array.isArray(myProfile.photos) ? myProfile.photos : [];
  if (existingPhotos.length === 0 && myProfile.avatar_url) {
    pendingPhotos[0] = { url: myProfile.avatar_url, existing: true };
  } else {
    existingPhotos.slice(0, 4).forEach((url, i) => {
      if (url) pendingPhotos[i] = { url, existing: true };
    });
  }
  renderPhotoGrid();

  $("#e-name").value = myProfile.name || "";
  $("#e-age").value = myProfile.age || "";
  $("#e-gender").value = myProfile.gender || "kadın";
  $("#e-marital").value = myProfile.marital_status || "Bekar";
  $("#e-education").value = myProfile.education || "";
  $("#e-height").value = myProfile.height || "";
  $("#e-weight").value = myProfile.weight || "";
  $("#e-job").value = myProfile.job || "";
  $("#e-bio").value = myProfile.bio || "";
  $("#e-interests").value = (myProfile.interests || []).join(", ");
  $("#e-country").value = normCountry(myProfile.country || "Türkiye");
  updateCityDropdown("e-country", "e-city");
  $("#e-city").value = myProfile.city || "";
  openModal("editProfileModal");
}

async function handleEditProfile(e) {
  e.preventDefault();
  if (!currentUser) return;
  const fd = new FormData(e.target); const data = Object.fromEntries(fd);
  data.age = Number(data.age);
  data.height = data.height ? Number(data.height) : null;
  data.weight = data.weight ? Number(data.weight) : null;
  data.interests = (data.interests || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!data.name || !data.age || !data.gender || !data.city || !data.country) { toast(t("fillRequired")); return; }
  if (data.age < 18) { toast(t("only18")); return; }

  const btn = $("#editProfileSubmitBtn");
  btn.disabled = true; btn.textContent = "…";

  const uploadedUrls = [];
  for (let i = 0; i < pendingPhotos.length; i++) {
    const photo = pendingPhotos[i];
    if (!photo) continue;
    if (photo.existing) {
      uploadedUrls.push(photo.url);
    } else if (photo.file) {
      try {
        btn.textContent = `Fotoğraf ${i + 1} yükleniyor...`;
        const compressed = await compressImage(photo.file, 1200, 1200, 0.85);
        const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
        const fileName = `${currentUser.id}/photo-${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await db.storage.from("chat-images").upload(fileName, compressed, { cacheControl: "3600", upsert: false });
        if (upErr) { toast("Fotoğraf yükleme hatası: " + upErr.message); btn.disabled = false; btn.textContent = t("save"); return; }
        const { data: urlData } = db.storage.from("chat-images").getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      } catch (err) {
        toast("Fotoğraf sıkıştırma hatası: " + err.message);
        btn.disabled = false; btn.textContent = t("save");
        return;
      }
    }
  }

  const avatar_url = uploadedUrls[0] || null;
  const updateData = {
    name: data.name, age: data.age, gender: data.gender, country: data.country,
    city: data.city, job: data.job || "", bio: data.bio || "",
    marital_status: data.marital_status || "Bekar",
    height: data.height, weight: data.weight, education: data.education || "",
    interests: data.interests, avatar_url, photos: uploadedUrls
  };

  const { error } = await db.from("profiles").update(updateData).eq("id", currentUser.id);
  if (error) { btn.disabled = false; btn.textContent = t("save"); toast("Hata: " + error.message); return; }

  myProfile = { ...myProfile, ...updateData };
  cancelPendingPhotos();
  btn.disabled = false; btn.textContent = t("save");
  closeModal("editProfileModal");
  updateNavbar(); loadProfiles();
  toast(t("profileUpdated"));
}

async function toggleLike(id) {
  if (!currentUser || !myProfile) { toast(t("lockedTitle")); openModal("registerModal"); return; }
  if (currentUser.id === id) return;
  const isFav = myLikes.has(id);
  if (isFav) {
    const { error } = await db.from("likes").delete().eq("liker_id", currentUser.id).eq("liked_id", id);
    if (error) { toast("Hata: " + error.message); return; }
    myLikes.delete(id);
    toast("💔 " + t("favoriteRemoved"));
  } else {
    const { error } = await db.from("likes").insert({ liker_id: currentUser.id, liked_id: id });
    if (error) {
      if (error.code === "23505") { toast(t("favoriteAlready")); return; }
      toast("Hata: " + error.message); return;
    }
    myLikes.add(id);
    toast("⭐ " + t("favoriteAdded"));
  }
  const btn = document.querySelector(`.like-btn[data-action="toggle-like"][data-id="${id}"]`);
  if (btn) {
    const now = myLikes.has(id);
    btn.classList.toggle("liked", now);
    btn.innerHTML = now ? "♥" : "♡";
    btn.title = now ? t("favoriteRemove") : t("favoriteAdd");
  }
  if ($("#detailModal").classList.contains("open")) {
    const modalBtn = document.querySelector(`.modal [data-action="toggle-like-modal"][data-id="${id}"]`);
    if (modalBtn) {
      const now = myLikes.has(id);
      modalBtn.className = `btn ${now ? "btn-ghost" : "btn-primary"}`;
      modalBtn.innerHTML = now ? t("favoriteRemove") : t("favoriteAdd");
    }
  }
}

function getCurrentFilters() {
  return {
    country: $("#f-country") ? $("#f-country").value : "hepsi",
    city: $("#f-city") ? $("#f-city").value.trim() : "",
    marital: $("#f-marital") ? $("#f-marital").value : "hepsi",
    education: $("#f-education") ? $("#f-education").value : "hepsi",
    ageMin: +($("#f-age-min") ? $("#f-age-min").value : 0) || 18,
    ageMax: +($("#f-age-max") ? $("#f-age-max").value : 0) || 99,
    heightMin: +($("#f-height-min") ? $("#f-height-min").value : 0) || null,
    heightMax: +($("#f-height-max") ? $("#f-height-max").value : 0) || null,
    weightMin: +($("#f-weight-min") ? $("#f-weight-min").value : 0) || null,
    weightMax: +($("#f-weight-max") ? $("#f-weight-max").value : 0) || null,
    search: $("#f-search") ? $("#f-search").value.trim() : ""
  };
}
function applyFilters() { loadProfiles(getCurrentFilters()); }
function resetFilters() {
  if ($("#f-country")) $("#f-country").value = "hepsi";
  if ($("#f-city")) $("#f-city").value = "";
  if ($("#dl-f-city")) $("#dl-f-city").innerHTML = "";
  if ($("#f-marital")) $("#f-marital").value = "hepsi";
  if ($("#f-education")) $("#f-education").value = "hepsi";
  if ($("#f-age-min")) $("#f-age-min").value = 18;
  if ($("#f-age-max")) $("#f-age-max").value = 99;
  if ($("#f-height-min")) $("#f-height-min").value = "";
  if ($("#f-height-max")) $("#f-height-max").value = "";
  if ($("#f-weight-min")) $("#f-weight-min").value = "";
  if ($("#f-weight-max")) $("#f-weight-max").value = "";
  if ($("#f-search")) $("#f-search").value = "";
  loadProfiles();
}
function quickSearch() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  const min = +$("#q-min").value || 18;
  const max = +$("#q-max").value || 99;
  $("#f-age-min").value = min;
  $("#f-age-max").value = max;
  loadProfiles({ ageMin: min, ageMax: max });
  const sec = document.getElementById("profiller");
  if (sec) sec.scrollIntoView({ behavior: "smooth" });
}

async function viewProfile(id) {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  const { data: p, error } = await db.from("profiles").select("*").eq("id", id).single();
  if (error || !p) { toast("Bulunamadı"); return; }
  if (id !== currentUser.id) {
    const key = `viewed_${id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      db.from("profile_views").insert({ viewer_id: currentUser.id, viewed_id: id }).then(() => {});
    }
  }
  const favorited = myLikes.has(p.id);
  const blocked = myBlocks.has(p.id);
  const ls = formatLastSeen(p.last_seen);
  const box = (label, val) => `<div style="background:#fbf7fa;border-radius:12px;padding:12px"><span style="display:block;font-size:.72rem;color:var(--muted);font-weight:600;text-transform:uppercase;margin-bottom:2px">${label}</span><b>${val}</b></div>`;
  const details = [];
  if (p.marital_status) details.push(box(t("maritalStatus"), esc(p.marital_status)));
  if (p.height) details.push(box(t("height"), `${p.height} cm`));
  if (p.weight) details.push(box(t("weight"), `${p.weight} kg`));
  if (p.education) details.push(box(t("education"), esc(p.education)));
  if (p.job) details.push(box(t("job"), esc(p.job)));
  if (p.city) details.push(box(t("city"), `${esc(p.city)}${p.country && p.country !== "Türkiye" ? ", " + esc(p.country) : ""}`));
  const avStyle = p.avatar_url ? `background:url('${esc(p.avatar_url)}') center/cover` : `background:${grad(p.id)}`;
  const avContent = p.avatar_url ? "" : initials(p.name);
  const blockedBanner = blocked ? `<div style="background:#ffe6ef;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.85rem;color:#c72c63;font-weight:600">⛔ ${t("blockedBadge")}</div>` : "";

  const photoList = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos : (p.avatar_url ? [p.avatar_url] : []);
  const photosHtml = photoList.length > 1 ? `<div class="profile-photos">${photoList.map(url => `<img src="${esc(url)}" data-action="open-lightbox" data-url="${esc(url)}" loading="lazy">`).join("")}</div>` : "";

  $("#detailBody").innerHTML = `
    <button class="close-x" data-action="close-modal" data-modal="detailModal">✕</button>
    <div class="card-top" style="margin-bottom:20px">
      <div class="avatar" style="${avStyle};width:78px;height:78px;font-size:1.5rem;border-radius:22px">${avContent}</div>
      <div style="min-width:0;flex:1">
        <h3 style="font-size:1.3rem">${esc(p.name)}, ${p.age}</h3>
        <div class="meta">${esc(p.job || "—")} · ${esc(p.city)}</div>
        <div class="last-seen ${ls.online ? "online" : ""}" style="margin-top:6px"><span class="dot"></span>${ls.text}</div>
      </div>
    </div>
    ${blockedBanner}
    ${photosHtml}
    ${details.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">${details.join("")}</div>` : ""}
    <h5 style="font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${t("aboutSection")}</h5>
    <p style="font-size:.92rem;background:#fbf7fa;padding:16px;border-radius:14px;margin-bottom:18px">${esc(p.bio || "—")}</p>
    <h5 style="font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${t("interestsSection")}</h5>
    <div class="tags" style="margin-bottom:20px">
      ${(p.interests || []).map(x => `<span class="tag">${esc(x)}</span>`).join("") || "<span style='color:var(--muted);font-size:.86rem'>—</span>"}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <button class="btn ${favorited ? "btn-ghost" : "btn-primary"}" data-action="toggle-like-modal" data-id="${p.id}" style="flex:1;min-width:120px">
        ${favorited ? t("favoriteRemove") : t("favoriteAdd")}
      </button>
      <button class="btn btn-primary" data-action="start-chat" data-id="${p.id}" style="flex:1;min-width:120px" ${blocked ? "disabled style='opacity:.5;flex:1;min-width:120px'" : ""}>${t("messageBtn")}</button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-ghost" data-action="toggle-block" data-id="${p.id}" style="flex:1;min-width:120px">
        ⛔ ${blocked ? t("unblockBtn") : t("blockBtn")}
      </button>
      <button class="btn btn-ghost" data-action="open-report" data-id="${p.id}" style="flex:1;min-width:120px;color:#c72c63">
        ⚠️ ${t("reportBtn")}
      </button>
    </div>`;
  openModal("detailModal");
}

function openMessages() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  $("#msgOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  refreshConversationList();
}
function closeMessages() {
  $("#msgOverlay").classList.remove("open");
  $("#msgContainer").classList.remove("chat-open");
  document.body.style.overflow = "";
  activeConvUserId = null;
  cancelPendingImage();
  if (convStatusInterval) { clearInterval(convStatusInterval); convStatusInterval = null; }
}

async function refreshConversationList() {
  if (!currentUser) return;
  const { data, error } = await db.from("messages").select("*").or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order("created_at", { ascending: false }).limit(500);
  if (error) return;
  const convs = {};
  (data || []).forEach(m => {
    const otherId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
    if (myBlocks.has(otherId)) return;
    if (!convs[otherId]) convs[otherId] = { last: m, unread: 0 };
    if (m.receiver_id === currentUser.id && !m.is_read) convs[otherId].unread++;
  });
  const list = Object.entries(convs).sort((a, b) => new Date(b[1].last.created_at) - new Date(a[1].last.created_at));
  const el = $("#convList");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="border:none;padding:30px 15px;font-size:.86rem">${t("noChats")}</div>`;
    return;
  }
  const missingIds = list.map(([id]) => id).filter(id => !allUsers[id]);
  if (missingIds.length) {
    const { data: profs } = await db.from("profiles").select("*").in("id", missingIds);
    (profs || []).forEach(p => allUsers[p.id] = p);
  }
  el.innerHTML = list.map(([id, conv]) => {
    const u = allUsers[id] || { name: "?" };
    const last = conv.last;
    const isActive = id === activeConvUserId;
    const time = formatTime(last.created_at);
    const preview = (last.sender_id === currentUser.id ? "Sen: " : "") + (last.content || (last.image_url ? "📷" : ""));
    const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(id)}`;
    const avContent = u.avatar_url ? "" : initials(u.name);
    return `<div class="conv-item ${isActive ? "active" : ""}" data-action="open-conv" data-id="${id}">
      <div class="avatar" style="${avStyle}">${avContent}</div>
      <div class="conv-info"><b>${esc(u.name)}</b><span>${esc(preview.slice(0, 40))}</span></div>
      <div class="conv-meta"><time>${time}</time>${conv.unread ? `<div class="unread">${conv.unread}</div>` : ""}</div>
    </div>`;
  }).join("");
}

function formatTime(iso) {
  const d = new Date(iso + (String(iso).endsWith("Z") ? "" : "Z")), now = new Date(), diff = (now - d) / 1000;
  if (diff < 60) return "şimdi";
  if (diff < 3600) return Math.floor(diff / 60) + " dk";
  if (diff < 86400) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' });
}

// ============================================================
// "YAZIYOR..." GÖSTERGESİ (Alt Kısımdaki Baloncuk)
// ============================================================
function showTypingIndicator(userId) {
  const bubble = document.getElementById("typingBubble");
  if (!bubble) return;
  bubble.style.display = "flex";
  clearTimeout(bubble._timer);
  bubble._timer = setTimeout(() => {
    bubble.style.display = "none";
  }, 3000);
}

async function openConversation(otherId) {
  if (!otherId) return;
  if (myBlocks.has(otherId)) { toast(t("blockedBadge")); return; }
  activeConvUserId = otherId;

  const { data: freshProfile } = await db.from("profiles").select("*").eq("id", otherId).single();
  if (freshProfile) allUsers[otherId] = freshProfile;

  const u = allUsers[otherId] || { name: "?" };
  const ls = formatLastSeen(u.last_seen);
  const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(otherId)}`;
  const avContent = u.avatar_url ? "" : initials(u.name);
  $("#msgMain").innerHTML = `
    <div class="msg-head">
      <button class="icon-btn" id="msgBack" data-action="msg-back" style="display:none">←</button>
      <div class="avatar" style="${avStyle};cursor:pointer" data-action="view-profile" data-id="${otherId}">${avContent}</div>
      <div class="msg-head-info" style="cursor:pointer" data-action="view-profile" data-id="${otherId}">
        <b>${esc(u.name)}</b>
        <span style="font-size:.78rem; font-weight:600; color:${ls.online ? 'var(--green)' : 'var(--muted)'}">${ls.text}</span>
      </div>
      <button class="icon-btn" data-action="close-messages">✕</button>
    </div>
    <div class="msg-body" id="msgBody"></div>
    <div class="typing-bubble" id="typingBubble" style="display:none">
      <span class="typing-dots"><span></span><span></span><span></span></span>
      <span>yazıyor...</span>
    </div>
    <div class="msg-img-preview" id="msgImgPreview">
      <img id="msgImgPreviewImg" src="" alt="">
      <div class="info"><b id="msgImgPreviewName"></b><span>${t("sendForBtn")}</span></div>
      <button class="remove" data-action="cancel-image">✕</button>
    </div>
    <div class="msg-input-row">
      <button class="msg-img-btn" data-action="pick-image">📷</button>
      <input type="file" id="msgImageInput" accept="image/*" style="display:none">
      <textarea id="msgInput" placeholder="${t("typeMessage")}" rows="1"></textarea>
      <button class="msg-send" data-action="send-msg">➤</button>
    </div>`;
  $("#msgContainer").classList.add("chat-open");
  if (window.innerWidth <= 980) $("#msgBack").style.display = "grid";
  const { data: msgs } = await db.from("messages").select("*")
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
    .order("created_at", { ascending: true });
  (msgs || []).forEach(m => appendMessage(m, false));
  await db.from("messages").update({ is_read: true }).eq("receiver_id", currentUser.id).eq("sender_id", otherId).eq("is_read", false);
  refreshUnreadCount();
  refreshConversationList();
  scrollToBottom();

  if (convStatusInterval) clearInterval(convStatusInterval);
  convStatusInterval = setInterval(async () => {
    if (activeConvUserId !== otherId) return;
    const { data: fresh } = await db.from("profiles").select("last_seen").eq("id", otherId).single();
    if (fresh && allUsers[otherId]) {
      allUsers[otherId].last_seen = fresh.last_seen;
      const ls2 = formatLastSeen(fresh.last_seen);
      const statusSpan = document.querySelector(".msg-head-info span");
      if (statusSpan) {
        statusSpan.textContent = ls2.text;
        statusSpan.style.color = ls2.online ? 'var(--green)' : 'var(--muted)';
      }
    }
  }, 30000);

  const input = $("#msgInput");
  input.focus();

  let typingTimeout;
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
    if (typingChannel) {
      typingChannel.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUser.id } });
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {}, 2000);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      if (typingChannel) {
        typingChannel.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUser.id, stop: true } });
      }
    }
  });
  $("#msgImageInput").addEventListener("change", handleImagePick);
}

function handleImagePick(e) {
  const file = e.target.files[0];
  if (!file || !activeConvUserId) return;
  if (file.size > 5 * 1024 * 1024) { toast(t("imageTooBig")); e.target.value = ""; return; }
  if (!file.type.startsWith("image/")) { toast(t("pickImage")); e.target.value = ""; return; }
  if (pendingImage) URL.revokeObjectURL(pendingImage.url);
  const localUrl = URL.createObjectURL(file);
  pendingImage = { file, url: localUrl };
  $("#msgImgPreviewImg").src = localUrl;
  $("#msgImgPreviewName").textContent = file.name;
  $("#msgImgPreview").classList.add("show");
  $("#msgInput").focus();
  e.target.value = "";
}

function cancelPendingImage() {
  if (pendingImage) { URL.revokeObjectURL(pendingImage.url); pendingImage = null; }
  const prev = $("#msgImgPreview"); if (prev) prev.classList.remove("show");
  const fi = $("#msgImageInput"); if (fi) fi.value = "";
}

function appendMessage(m, scroll = true) {
  const body = $("#msgBody"); if (!body) return;
  const isMe = m.sender_id === currentUser.id;
  const div = document.createElement("div");
  div.className = "msg " + (isMe ? "me" : "them");
  if (m.id && !String(m.id).startsWith("temp-")) div.dataset.msgId = m.id;
  const timeStr = new Date(m.created_at + (String(m.created_at).endsWith("Z") ? "" : "Z")).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  let inner = "";
  if (m.image_url) inner += `<img src="${esc(m.image_url)}" data-action="open-lightbox" data-url="${esc(m.image_url)}" loading="lazy">`;
  if (m.content) inner += escapeText(m.content);
  inner += `<div class="msg-meta">`;
  inner += `<time>${timeStr}</time>`;
  if (isMe) {
    inner += `<span class="msg-check">✓✓</span>`;
    if (m.id && !String(m.id).startsWith("temp-")) {
      inner += `<button class="msg-del" data-action="delete-msg" data-id="${m.id}" title="${t("deleteMsg")}">🗑️</button>`;
    }
  }
  inner += `</div>`;
  div.innerHTML = inner;
  body.appendChild(div);
  if (scroll) {
    scrollToBottom();
    div.querySelectorAll('img').forEach(img => {
      if (!img.complete) { img.addEventListener('load', () => { if (scroll) scrollToBottom(); }); }
    });
    setTimeout(() => { if (scroll) scrollToBottom(); }, 150);
    setTimeout(() => { if (scroll) scrollToBottom(); }, 400);
    setTimeout(() => { if (scroll) scrollToBottom(); }, 800);
  }
}

function escapeText(t) {
  return String(t).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])).replace(/\n/g, "<br>");
}
function scrollToBottom() { const body = $("#msgBody"); if (body) body.scrollTop = body.scrollHeight; }

async function sendMessage() {
  const input = $("#msgInput");
  if (!input || !activeConvUserId) return;
  if (myBlocks.has(activeConvUserId)) { toast(t("blockedBadge")); return; }
  const content = input.value.trim();
  if (!content && !pendingImage) return;
  const sendBtn = $(".msg-send");
  if (sendBtn) sendBtn.disabled = true;
  let imageUrl = null;
  if (pendingImage) {
    toast(t("uploading"), 2000);
    try {
      const compressed = await compressImage(pendingImage.file, 1200, 1200, 0.85);
      const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${currentUser.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from("chat-images").upload(fileName, compressed, { cacheControl: "3600", upsert: false });
      if (upErr) { toast("Hata: " + upErr.message); if (sendBtn) sendBtn.disabled = false; return; }
      const { data: urlData } = db.storage.from("chat-images").getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    } catch (err) {
      toast("Sıkıştırma hatası: " + err.message); if (sendBtn) sendBtn.disabled = false; return;
    }
  }
  const { data: inserted, error } = await db.from("messages").insert({ sender_id: currentUser.id, receiver_id: activeConvUserId, content: content || "", image_url: imageUrl }).select().single();
  if (error) { toast("Hata: " + error.message); if (sendBtn) sendBtn.disabled = false; return; }
  appendMessage(inserted, true);
  input.value = "";
  input.style.height = "auto";
  cancelPendingImage();
  if (sendBtn) sendBtn.disabled = false;
  refreshConversationList();
}

async function deleteMessage(id) {
  if (!id) return;
  if (!confirm(t("confirmDelete"))) return;
  const { error } = await db.from("messages").delete().eq("id", id).eq("sender_id", currentUser.id);
  if (error) { toast("Hata: " + error.message); return; }
  const el = document.querySelector(`.msg[data-msg-id="${id}"]`);
  if (el) el.remove();
  refreshConversationList();
  toast(t("msgDeleted"));
}

async function startChatWith(userId) {
  if (!currentUser) { openModal("loginModal"); return; }
  if (currentUser.id === userId) return;
  if (!myProfile) return;
  if (myBlocks.has(userId)) { toast(t("blockedBadge")); return; }
  closeModal("detailModal");
  openMessages();
  await openConversation(userId);
}

function openLightbox(url) { $("#lightboxImg").src = url; $("#lightbox").classList.add("open"); }
function closeLightbox() { $("#lightbox").classList.remove("open"); $("#lightboxImg").src = ""; }

function renderMyProfileHeader() {
  if (!myProfile) return;
  const av = $("#myProfileAvatar");
  const nm = $("#myProfileName");
  const mt = $("#myProfileMeta");
  if (av) {
    if (myProfile.avatar_url) {
      av.style.background = `url('${myProfile.avatar_url}') center/cover`;
      av.textContent = "";
    } else {
      av.style.background = grad(currentUser.id);
      av.textContent = initials(myProfile.name);
    }
  }
  if (nm) nm.textContent = `${myProfile.name}, ${myProfile.age}`;
  if (mt) {
    const parts = [];
    if (myProfile.marital_status) parts.push(myProfile.marital_status);
    if (myProfile.city) parts.push(myProfile.city);
    if (myProfile.job) parts.push(myProfile.job);
    mt.textContent = parts.join(" · ") || "—";
  }

  const fields = ['name', 'age', 'gender', 'city', 'country', 'job', 'bio', 'marital_status', 'education', 'height', 'weight'];
  const filledFields = fields.filter(f => myProfile[f] && myProfile[f] !== "" && myProfile[f] !== null);
  const completionRate = Math.round((filledFields.length / fields.length) * 100);

  const completionEl = document.getElementById("profileCompletion");
  if (completionEl) {
    completionEl.innerHTML = `
      <div style="margin-top: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--muted); margin-bottom: 4px;">
          <span>Profil Tamamlama</span>
          <span>%${completionRate}</span>
        </div>
        <div style="width: 100%; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
          <div style="width: ${completionRate}%; height: 100%; background: linear-gradient(90deg, var(--rose), var(--plum)); border-radius: 3px; transition: width 0.4s ease;"></div>
        </div>
        ${completionRate < 100 ? `<p style="font-size: 0.75rem; color: var(--muted); margin-top: 6px;">Daha fazla bilgi ekleyerek eşleşme şansınızı artırın!</p>` : ''}
      </div>
    `;
  }
}

async function openMyProfile() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  openModal("myProfileModal");
  renderMyProfileHeader();
  await loadStats();
}

async function openMyFavorites() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  openModal("myFavoritesModal");
  const list = $("#favoritesList");
  if (!list) return;
  list.innerHTML = `<div class="empty" style="border:none">⏳ ${t("loading")}</div>`;
  const { data: likes } = await db.from("likes").select("liked_id").eq("liker_id", currentUser.id);
  const ids = (likes || []).map(l => l.liked_id);
  if (!ids.length) {
    list.innerHTML = `<div class="empty" style="border:none">${t("noFavorites")}</div>`;
    return;
  }
  const { data: profs } = await db.from("profiles").select("*").in("id", ids);
  const myFavs = profs || [];
  myFavs.forEach(p => allUsers[p.id] = p);
  if (!myFavs.length) {
    list.innerHTML = `<div class="empty" style="border:none">${t("noFavorites")}</div>`;
    return;
  }
  list.innerHTML = myFavs.map(p => {
    const ls = formatLastSeen(p.last_seen);
    const avStyle = p.avatar_url ? `background:url('${esc(p.avatar_url)}') center/cover` : `background:${grad(p.id)}`;
    const avContent = p.avatar_url ? "" : initials(p.name);
    return `<div class="account-row" style="padding:12px">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div class="avatar" style="${avStyle};width:50px;height:50px;border-radius:14px;font-size:.9rem">${avContent}</div>
        <div style="min-width:0">
          <b>${esc(p.name)}, ${p.age}</b>
          <div class="val" style="margin-top:2px">${esc(p.city || "")}</div>
          <div class="last-seen ${ls.online ? "online" : ""}" style="margin-top:3px"><span class="dot"></span>${ls.text}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" data-action="view-profile" data-id="${p.id}">${t("profileBtn")}</button>
        <button class="btn btn-ghost btn-sm" data-action="toggle-like" data-id="${p.id}" style="color:#c72c63" title="${t("favoriteRemove")}">♥</button>
      </div>
    </div>`;
  }).join("");
}

async function openAccount() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  openModal("accountModal");
  $$(".account-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === "filter"));
  $$(".account-panel").forEach(p => p.classList.toggle("active", p.id === "acc-panel-filter"));
  const ce = $("#accCurrentEmail"); if (ce) ce.textContent = currentUser.email || "—";
  const prefMin = $("#pref-min"), prefMax = $("#pref-max");
  if (prefMin && prefMax) {
    prefMin.value = myProfile.pref_age_min || 18;
    prefMax.value = myProfile.pref_age_max || 70;
    updatePrefSlider();
  }
  const eNotif = $("#prefEmailNotif");
  const sNotif = $("#prefSmsNotif");
  if (eNotif) eNotif.checked = myProfile.pref_email_notif !== false;
  if (sNotif) sNotif.checked = !!myProfile.pref_sms_notif;
  const langSel = $("#prefLang");
  const hideOn = $("#prefHideOnline");
  if (langSel) langSel.value = currentLang || "tr";
  if (hideOn) hideOn.checked = !!myProfile.pref_hide_online;
}

function updatePrefSlider() {
  const minSlider = $("#pref-min"), maxSlider = $("#pref-max");
  const fill = $("#prefRangeFill"), mn = $("#prefAgeMin"), mx = $("#prefAgeMax");
  if (!minSlider || !maxSlider || !fill) return;
  const MIN = 18, MAX = 99;
  let lo = +minSlider.value, hi = +maxSlider.value;
  if (lo > hi - 1) {
    if (document.activeElement === minSlider) { minSlider.value = hi - 1; lo = hi - 1; }
    else { maxSlider.value = lo + 1; hi = lo + 1; }
  }
  fill.style.left = ((lo - MIN) / (MAX - MIN)) * 100 + "%";
  fill.style.width = ((hi - lo) / (MAX - MIN)) * 100 + "%";
  if (mn) mn.textContent = lo;
  if (mx) mx.textContent = hi;
}

async function loadStats() {
  const body = $("#statsBody");
  if (!body) return;
  body.innerHTML = `<div class="empty" style="border:none">⏳ Yükleniyor...</div>`;
  const { count: likeCount } = await db.from("likes").select("*", { count: "exact", head: true }).eq("liked_id", currentUser.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: views } = await db.from("profile_views").select("viewer_id").eq("viewed_id", currentUser.id).gte("created_at", thirtyDaysAgo);
  const uniqueViewers = new Set((views || []).map(v => v.viewer_id)).size;
  const { count: totalViews } = await db.from("profile_views").select("*", { count: "exact", head: true }).eq("viewed_id", currentUser.id);
  const favCount = myLikes.size;
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="stat-box"><div class="stat-num" style="color:var(--rose)">${likeCount || 0}</div><div class="stat-label">${t("statLikes")}</div></div>
      <div class="stat-box"><div class="stat-num">${uniqueViewers}</div><div class="stat-label">${t("statViews30")}</div></div>
      <div class="stat-box"><div class="stat-num">${totalViews || 0}</div><div class="stat-label">${t("statTotalViews")}</div></div>
      <div class="stat-box"><div class="stat-num" style="color:var(--plum)">${favCount}</div><div class="stat-label">${t("statMyFavorites")}</div></div>
    </div>
    <p style="text-align:center;font-size:.78rem;color:var(--muted);margin-top:16px">${t("statsUpdatedNow")}</p>`;
}

async function savePrefs() {
  const mn = +$("#pref-min").value, mx = +$("#pref-max").value;
  const { error } = await db.from("profiles").update({ pref_age_min: mn, pref_age_max: mx }).eq("id", currentUser.id);
  if (error) { toast("Hata: " + error.message); return; }
  myProfile.pref_age_min = mn;
  myProfile.pref_age_max = mx;
  toast("✅ " + t("prefsSaved"));
}

async function saveNotifPrefs() {
  const e = $("#prefEmailNotif").checked;
  const s = $("#prefSmsNotif").checked;
  const { error } = await db.from("profiles").update({ pref_email_notif: e, pref_sms_notif: s }).eq("id", currentUser.id);
  if (error) { toast("Hata: " + error.message); return; }
  myProfile.pref_email_notif = e;
  myProfile.pref_sms_notif = s;
  toast("✅ " + t("prefsSaved"));
}

async function changeEmail() {
  const newEmail = $("#accNewEmail").value.trim();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast(t("invalidEmail")); return; }
  if (newEmail === currentUser.email) { toast(t("emailSame")); return; }
  const { error } = await db.auth.updateUser({ email: newEmail });
  if (error) { toast("Hata: " + error.message); return; }
  toast(t("emailChangeSent"), 7000);
  $("#accNewEmail").value = "";
}

async function saveAccountPassword() {
  const cur = $("#accCurPw").value;
  const pw = $("#accNewPw").value, pw2 = $("#accNewPw2").value;
  if (!cur || !pw || !pw2) { toast(t("fillRequired")); return; }
  if (pw !== pw2) { toast(t("passwordMismatch")); return; }
  if (pw.length < 6) { toast(t("passwordShort")); return; }
  const { error: signErr } = await db.auth.signInWithPassword({ email: currentUser.email, password: cur });
  if (signErr) { toast(t("currentPasswordWrong")); return; }
  const { error } = await db.auth.updateUser({ password: pw });
  if (error) { toast("Hata: " + error.message); return; }
  $("#accCurPw").value = ""; $("#accNewPw").value = ""; $("#accNewPw2").value = "";
  toast(t("passwordUpdated"));
}

async function saveAppearance() {
  const lang = $("#prefLang").value;
  const hide = $("#prefHideOnline").checked;
  const { error } = await db.from("profiles").update({ pref_hide_online: hide }).eq("id", currentUser.id);
  if (error) { toast("Hata: " + error.message); return; }
  myProfile.pref_hide_online = hide;
  toast("✅ " + t("prefsSaved"));
  if (lang && lang !== currentLang) setLanguage(lang);
}

async function freezeAccount() {
  if (!confirm(t("freezeConfirm"))) return;
  toast(t("freezeComingSoon"), 5000);
}

async function deleteAccount() {
  if (!confirm(t("deleteConfirm1"))) return;
  if (!confirm(t("deleteConfirm2"))) return;
  const { error } = await db.from("profiles").delete().eq("id", currentUser.id);
  if (error) { toast("Hata: " + error.message); return; }
  await db.auth.signOut();
  toast(t("accountDeleted"), 5000);
  setTimeout(() => location.reload(), 1500);
}

async function loadBlockedList() {
  const el = $("#blockedList");
  if (!el || !currentUser) return;
  el.innerHTML = `<div class="empty" style="border:none">⏳ Yükleniyor...</div>`;
  const { data: blocks } = await db.from("blocks").select("blocked_id").eq("blocker_id", currentUser.id);
  const ids = (blocks || []).map(b => b.blocked_id);
  if (!ids.length) {
    el.innerHTML = `<div class="empty" style="border:none">${t("noBlocked")}</div>`;
    return;
  }
  const { data: profs } = await db.from("profiles").select("*").in("id", ids);
  el.innerHTML = (profs || []).map(p => {
    const avStyle = p.avatar_url ? `background:url('${esc(p.avatar_url)}') center/cover` : `background:${grad(p.id)}`;
    const avContent = p.avatar_url ? "" : initials(p.name);
    return `<div class="account-row">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="avatar" style="${avStyle};width:40px;height:40px;border-radius:11px;font-size:.8rem">${avContent}</div>
        <div><b>${esc(p.name)}</b><div class="val">${esc(p.city || "")}</div></div>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="toggle-block" data-id="${p.id}">${t("unblockBtn")}</button>
    </div>`;
  }).join("");
}

document.addEventListener("click", async e => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  const modal = el.dataset.modal;
  if (el.tagName === "A") e.preventDefault();
  switch (action) {
    case "open-login": closeAllModals(); openModal("loginModal"); break;
    case "open-register": closeAllModals(); openModal("registerModal"); break;
    case "open-forgot": closeAllModals(); openModal("forgotPasswordModal"); break;
    case "open-change-password": closeAllModals(); openModal("changePasswordModal"); break;
    case "close-modal": closeModal(modal); break;
    case "open-legal": {
      const legal = el.dataset.legal;
      const map = { kvkk: "legalKvkkModal", privacy: "legalPrivacyModal", terms: "legalTermsModal" };
      if (map[legal]) { closeAllModals(); openModal(map[legal]); }
      break;
    }
    case "open-edit-profile": closeAllModals(); openEditProfile(); break;
    case "pick-edit-photo": $("#editPhotoInput").click(); break;
    case "logout": await handleLogout(); break;
    case "toggle-like": await toggleLike(id); break;
    case "toggle-like-modal": await toggleLike(id); await viewProfile(id); break;
    case "toggle-block": await toggleBlock(id); break;
    case "open-report": openReportModal(id); break;
    case "view-profile": await viewProfile(id); break;
    case "quick-search": quickSearch(); break;
    case "apply-filters": applyFilters(); break;
    case "reset-filters": resetFilters(); break;
    case "open-messages": openMessages(); break;
    case "close-messages": closeMessages(); break;
    case "open-conv": await openConversation(id); break;
    case "send-msg": await sendMessage(); break;
    case "start-chat": await startChatWith(id); break;
    case "msg-back": $("#msgContainer").classList.remove("chat-open"); break;
    case "pick-image": if ($("#msgImageInput")) $("#msgImageInput").click(); break;
    case "cancel-image": cancelPendingImage(); break;
    case "open-lightbox": openLightbox(el.dataset.url); break;
    case "close-lightbox": closeLightbox(); break;
    case "delete-msg": e.stopPropagation(); await deleteMessage(id); break;
    case "open-notifications": closeAllModals(); openModal("notificationsModal"); renderNotifications(); break;
    case "open-notif": await openNotification(id, el.dataset.actor, el.dataset.type); break;
    case "mark-all-read": await markAllRead(); break;
    case "toggle-user-menu": e.stopPropagation(); { const _dd = $("#userMenuDropdown"); if (_dd) _dd.classList.toggle("open"); } break;
    case "open-my-profile": closeAllModals(); await openMyProfile(); break;
    case "open-my-favorites": closeAllModals(); await openMyFavorites(); break;
    case "open-account": closeAllModals(); await openAccount(); break;
    case "account-tab": {
      const tab = el.dataset.tab;
      $$(".account-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
      $$(".account-panel").forEach(p => p.classList.toggle("active", p.id === "acc-panel-" + tab));
      if (tab === "blocked") await loadBlockedList();
      break;
    }
    case "save-prefs": await savePrefs(); break;
    case "save-notif-prefs": await saveNotifPrefs(); break;
    case "change-email": await changeEmail(); break;
    case "save-account-password": await saveAccountPassword(); break;
    case "save-appearance": await saveAppearance(); break;
    case "freeze-account": await freezeAccount(); break;
    case "delete-account": await deleteAccount(); break;
  }
});

document.addEventListener("click", e => {
  if (e.target.classList.contains("photo-remove")) {
    e.stopPropagation();
    const slot = e.target.dataset.slot;
    if (slot !== undefined) removePhotoAtSlot(parseInt(slot));
  }
});

document.addEventListener("click", e => {
  const slot = e.target.closest(".photo-slot");
  if (slot && !e.target.classList.contains("photo-remove")) {
    const idx = parseInt(slot.dataset.slot);
    if (!pendingPhotos[idx]) {
      $("#editPhotoInput").click();
    }
  }
});

$$(".overlay").forEach(ov => {
  ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id); });
});

document.addEventListener("click", e => {
  const um = document.querySelector(".user-menu");
  if (um && !um.contains(e.target)) {
    const dd = document.getElementById("userMenuDropdown");
    if (dd) dd.classList.remove("open");
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeAllModals();
    closeLightbox();
    if ($("#msgOverlay").classList.contains("open")) closeMessages();
  }
});

document.addEventListener("input", e => {
  if (e.target.id === "pref-min" || e.target.id === "pref-max") updatePrefSlider();
});

if ($("#registerForm")) $("#registerForm").addEventListener("submit", handleRegister);
if ($("#loginForm")) $("#loginForm").addEventListener("submit", handleLogin);
if ($("#editProfileForm")) $("#editProfileForm").addEventListener("submit", handleEditProfile);
if ($("#editPhotoInput")) $("#editPhotoInput").addEventListener("change", handleEditPhotoPick);
if ($("#forgotForm")) $("#forgotForm").addEventListener("submit", handleForgotPassword);
if ($("#resetPasswordForm")) $("#resetPasswordForm").addEventListener("submit", handleResetPassword);
if ($("#changePasswordForm")) $("#changePasswordForm").addEventListener("submit", handleChangePassword);
if ($("#reportForm")) $("#reportForm").addEventListener("submit", handleReport);

document.addEventListener("change", e => {
  const map = { "r-country": "r-city", "e-country": "e-city", "f-country": "f-city" };
  const cityId = map[e.target.id];
  if (cityId) {
    const cityEl = $("#" + cityId);
    if (cityEl) cityEl.value = "";
    updateCityDropdown(e.target.id, cityId);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("langBtn");
  const menu = document.getElementById("langMenu");
  if (btn && menu) {
    btn.addEventListener("click", e => { e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", () => menu.classList.remove("open"));
    menu.addEventListener("click", e => {
      const opt = e.target.closest("[data-lang]");
      if (opt) { setLanguage(opt.dataset.lang); menu.classList.remove("open"); }
    });
  }
});

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  const heroCta = document.getElementById("heroCta");
  if (heroCta && !document.getElementById("pwaInstallBtn")) {
    const btn = document.createElement("button");
    btn.id = "pwaInstallBtn";
    btn.className = "btn btn-ghost";
    btn.setAttribute("data-i18n", "installApp");
    btn.textContent = t("installApp") || "📲 Uygulamayı Yükle";
    btn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") { toast("✅ Uygulama yüklendi!"); }
        deferredPrompt = null;
        btn.remove();
      }
    });
    heroCta.appendChild(btn);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("gb_remembered_email");
  if (savedEmail) {
    const loginEmailInput = document.querySelector('#loginForm input[name="email"]');
    const rememberCheckbox = document.querySelector('#loginForm input[name="remember"]');
    if (loginEmailInput) loginEmailInput.value = savedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

async function requestNotificationPermission() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    if (Notification.permission === "denied") return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    if (currentUser && subscription) {
      await db.from("push_subscriptions").upsert({
        user_id: currentUser.id,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    }
  } catch (e) { console.error("Push aboneliği hatası:", e); }
}

(async function init() {
  fillCountriesAndCities();
  setupAgeSlider();
  const l = LANGS.find(x => x.code === currentLang) || LANGS[0];
  const flagEl = document.getElementById("langFlag");
  const nameEl = document.getElementById("langName");
  if (flagEl) flagEl.innerHTML = '<img src="https://flagcdn.com/w40/' + l.flag + '.png" alt="' + l.flag + '" style="width:20px;height:14px;object-fit:cover;border-radius:2px;vertical-align:middle;display:inline-block">';
  if (nameEl) nameEl.textContent = l.name;
  document.documentElement.dir = (currentLang === "ar" || currentLang === "fa" || currentLang === "ku") ? "rtl" : "ltr";
  document.documentElement.lang = currentLang;
  buildLangMenu();
  applyTranslations();

  setInterval(updateLastSeen, 30000);

  setInterval(async () => {
    if (currentUser && !document.hidden) {
      await forceLogoutIfBanned();
    }
  }, 30000);

  window.addEventListener("beforeunload", () => {
    if (currentUser) {
      const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${currentUser.id}`;
      const data = JSON.stringify({ last_seen: new Date().toISOString() });
      try {
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } catch(e) {}
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && currentUser && myProfile) {
      loadProfiles(getCurrentFilters());
      updateLastSeen();
    }
  });

  db.auth.onAuthStateChange(async (event) => {
    if (event === "PASSWORD_RECOVERY") { closeAllModals(); openModal("resetPasswordModal"); return; }
    if (event === "SIGNED_OUT") {
      currentUser = null; myProfile = null; myLikes = new Set(); myBlocks = new Set(); unreadCount = 0;
      myNotifications = []; unreadNotifCount = 0;
      isAdminUser = false;
      if (realtimeChannel) { db.removeChannel(realtimeChannel); realtimeChannel = null; }
      if (typingChannel) { db.removeChannel(typingChannel); typingChannel = null; }
      if (notificationChannel) { db.removeChannel(notificationChannel); notificationChannel = null; }
      if (convStatusInterval) { clearInterval(convStatusInterval); convStatusInterval = null; }
      updateNavbar(); updateProfileSection(); updateHeroBoxes();
    } else if (event === "SIGNED_IN") {
      const { data } = await db.auth.getSession();
      if (data.session) {
        currentUser = data.session.user;

        if (await checkIfBanned(currentUser.id)) {
          await db.auth.signOut();
          currentUser = null;
          myProfile = null;
          updateNavbar(); updateProfileSection(); updateHeroBoxes();
          toast("⛔ Hesabınız askıya alınmıştır.", 10000);
          return;
        }

        const { data: adminCheck } = await db.from("admins").select("user_id").eq("user_id", currentUser.id).maybeSingle();
        isAdminUser = !!adminCheck;
        await loadMyProfile();
        await applyPendingProfile();
        await loadMyBlocks();
        await loadNotifications();
        await updateLastSeen();
        updateNavbar(); updateProfileSection(); updateHeroBoxes();
        loadProfiles();
        requestNotificationPermission();
      }
    }
  });

  await checkSession();
  await loadProfiles();
})();