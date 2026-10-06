// ============================================================
// SUPABASE BAĞLANTISI
// ============================================================
const SUPABASE_URL = "https://mrlyghqqyvrdcwwmhpwj.supabase.co";
const SUPABASE_KEY = "sb_publishable_EW46ECy6Lv4Z1qJ_UPPx1A_JbU3G_rG";
const ADMIN_EMAILS = ["fd1328fd@gmail.com"];

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const GRADS = ["linear-gradient(135deg,#e8437c,#c72c63)","linear-gradient(135deg,#6d3b8f,#9b5fc0)","linear-gradient(135deg,#2e9e8f,#1f7a6e)","linear-gradient(135deg,#e08c2e,#c06a12)","linear-gradient(135deg,#3b7dd8,#2a5aa0)","linear-gradient(135deg,#d84a6b,#a52e4d)","linear-gradient(135deg,#5a4bd8,#3f32a8)","linear-gradient(135deg,#0f9b8e,#0a6f66)"];
const grad = id => { let h = 0; for (let i = 0; i < (id || "").length; i++) h = (h + id.charCodeAt(i)) % GRADS.length; return GRADS[h]; };
const initials = n => String(n || "?").trim().split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

let currentUser = null, myProfile = null, myLikes = new Set(), myBlocks = new Set(), allProfiles = [], unreadCount = 0;
let activeConvUserId = null, realtimeChannel = null, allUsers = {}, pendingImage = null, pendingProfilePhoto = null;
let reportingUserId = null;
let myNotifications = [], notificationChannel = null, unreadNotifCount = 0;

// ============================================================
// TOAST
// ============================================================
function toast(msg, ms = 3500) {
  const el = $("#toast");
  el.innerHTML = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), ms);
}

// ============================================================
// BEKLEYEN PROFİL
// ============================================================
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

// ============================================================
// ÜLKE & ŞEHİR
// ============================================================
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

// ============================================================
// YAŞ SLIDER
// ============================================================
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

// ============================================================
// MODAL
// ============================================================
function openModal(id) { $("#" + id).classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal(id) { const el = $("#" + id); if (el) el.classList.remove("open"); document.body.style.overflow = ""; }
function closeAllModals() { $$(".overlay").forEach(o => o.classList.remove("open")); document.body.style.overflow = ""; }

// ============================================================
// OTURUM
// ============================================================
async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    await loadMyProfile();
    await applyPendingProfile();
    await loadMyLikes();
    await loadMyBlocks();
    await initRealtime();
    await initNotificationRealtime();
    await refreshUnreadCount();
    await loadNotifications();
  }
  updateNavbar();
  updateProfileSection();
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
  if (type === "message") {
    await startChatWith(actorId);
  } else {
    await viewProfile(actorId);
  }
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

// ============================================================
// İSTATİSTİKLER
// ============================================================
async function openStats() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  openModal("statsModal");
  const body = $("#statsBody");
  body.innerHTML = `<div class="empty" style="border:none">⏳ Yükleniyor...</div>`;

  const { count: likeCount } = await db.from("likes")
    .select("*", { count: "exact", head: true })
    .eq("liked_id", currentUser.id);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: views } = await db.from("profile_views")
    .select("viewer_id")
    .eq("viewed_id", currentUser.id)
    .gte("created_at", thirtyDaysAgo);
  const uniqueViewers = new Set((views || []).map(v => v.viewer_id)).size;

  const { count: totalViews } = await db.from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("viewed_id", currentUser.id);

  const favCount = myLikes.size;

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="stat-box">
        <div class="stat-num" style="color:var(--rose)">${likeCount || 0}</div>
        <div class="stat-label">${t("statLikes")}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${uniqueViewers}</div>
        <div class="stat-label">${t("statViews30")}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${totalViews || 0}</div>
        <div class="stat-label">${t("statTotalViews")}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:var(--plum)">${favCount}</div>
        <div class="stat-label">${t("statMyFavorites")}</div>
      </div>
    </div>
    <p style="text-align:center;font-size:.78rem;color:var(--muted);margin-top:16px">
      ${t("statsUpdatedNow")}
    </p>
  `;
}

// ============================================================
// NAVBAR
// ============================================================
function updateNavbar() {
  const nav = $("#navActions");
  if (currentUser && myProfile) {
    const isAdmin = currentUser.email && ADMIN_EMAILS.includes(currentUser.email);
    const adminBtn = isAdmin
      ? `<a href="admin.html" class="icon-btn" title="Admin Panel" style="background:linear-gradient(135deg,#e8437c,#6d3b8f);color:#fff;border-color:transparent;text-decoration:none;display:grid">🛡️</a>`
      : "";
    const adminBadge = isAdmin
      ? `<span style="font-size:.6rem;font-weight:800;background:linear-gradient(135deg,#e8437c,#6d3b8f);color:#fff;padding:2px 6px;border-radius:6px;margin-left:6px;letter-spacing:.05em;vertical-align:middle">ADMIN</span>`
      : "";
    const badge = unreadCount > 0 ? `<span class="badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : "";
    const notifBadge = unreadNotifCount > 0 ? `<span class="badge">${unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>` : "";
    const avStyle = myProfile.avatar_url ? `background:url('${esc(myProfile.avatar_url)}') center/cover` : `background:${grad(currentUser.id)}`;
    const avContent = myProfile.avatar_url ? "" : initials(myProfile.name);
    const nameBorder = isAdmin ? ";box-shadow:0 0 0 2px #e8437c" : "";
    nav.innerHTML = `
      ${adminBtn}
      <button class="icon-btn" data-action="open-notifications" title="${t("notifications")}">🔔${notifBadge}</button>
      <button class="icon-btn" data-action="open-stats" title="${t("myStats")}">📊</button>
      <button class="icon-btn" data-action="open-messages">💬${badge}</button>
      <button class="icon-btn" data-action="open-edit-profile">⚙️</button>
      <div class="user-badge" data-action="open-edit-profile">
        <div class="avatar" style="${avStyle}${nameBorder}">${avContent}</div>
        <span class="hide-mobile">${esc(myProfile.name)}${adminBadge}</span>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="logout">${t("logout")}</button>`;
  } else if (currentUser && !myProfile) {
    nav.innerHTML = `<button class="btn btn-ghost btn-sm" data-action="logout">${t("logout")}</button>`;
  } else {
    nav.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-action="open-login">${t("login")}</button>
      <button class="btn btn-primary btn-sm" data-action="open-register">${t("signup")}</button>`;
  }
}

// ============================================================
// KİLİTLİ EKRAN
// ============================================================
function updateProfileSection() {
  const filterPanel = $("#filterPanel");
  const grid = $("#profileGrid");
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
    $("#profileCount").textContent = t("lockedTitle");
    return;
  }
  filterPanel.style.display = "block";
}

// ============================================================
// REALTIME
// ============================================================
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
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${currentUser.id}` }, () => {
      refreshConversationList();
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, payload => {
      const delId = payload.old.id;
      if (delId) { const el = document.querySelector(`.msg[data-msg-id="${delId}"]`); if (el) el.remove(); }
      refreshConversationList();
    })
    .subscribe();
}

async function refreshUnreadCount() {
  if (!currentUser) return;
  const { count } = await db.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", currentUser.id).eq("is_read", false);
  unreadCount = count || 0;
  updateNavbar();
}

// ============================================================
// PROFİL KARTLARI
// ============================================================
function avatarHtml(p) {
  if (p.avatar_url) return `<div class="avatar" style="background:url('${esc(p.avatar_url)}') center/cover"></div>`;
  return `<div class="avatar" style="background:${grad(p.id)}">${initials(p.name)}</div>`;
}

async function loadProfiles(filters = {}) {
  if (!currentUser || !myProfile) { updateProfileSection(); return; }
  const grid = $("#profileGrid");
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
    $("#profileCount").textContent = `0 ${t("membersFound")}`;
    return;
  }
  $("#profileCount").textContent = `${list.length} ${t("membersFound")}`;
  grid.innerHTML = list.map(p => {
    const favorited = myLikes.has(p.id);
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

// ============================================================
// KAYIT
// ============================================================
async function handleRegister(e) {
  e.preventDefault();
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
  const profileData = {
    name: data.name, age: data.age, gender: data.gender,
    country: data.country || "Türkiye", city: data.city,
    job: data.job || "", bio: data.bio || "",
    marital_status: data.marital_status || "Bekar",
    height: data.height, weight: data.weight,
    education: data.education || "", interests: data.interests
  };
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
  myLikes = new Set();
  myBlocks = new Set();
  closeAllModals();
  updateNavbar(); updateProfileSection();
  await initRealtime(); initNotificationRealtime(); await loadNotifications();
  loadProfiles();
  toast(`🎉 ${t("welcomeToast")} ${data.name.split(" ")[0]}!`);
}

// ============================================================
// GİRİŞ
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get("email"), password = fd.get("password");
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
  await loadMyProfile(); await applyPendingProfile(); await loadMyLikes(); await loadMyBlocks();
  await initRealtime(); await initNotificationRealtime();
  await refreshUnreadCount(); await loadNotifications();
  closeAllModals();
  updateNavbar(); updateProfileSection(); loadProfiles();
  toast(t("loginSuccess"));
}

async function handleLogout() {
  if (realtimeChannel) { db.removeChannel(realtimeChannel); realtimeChannel = null; }
  if (notificationChannel) { db.removeChannel(notificationChannel); notificationChannel = null; }
  await db.auth.signOut();
  currentUser = null; myProfile = null; myLikes = new Set(); myBlocks = new Set(); unreadCount = 0;
  myNotifications = []; unreadNotifCount = 0;
  activeConvUserId = null;
  cancelPendingImage(); cancelPendingProfilePhoto();
  closeMessages();
  updateNavbar(); updateProfileSection();
  toast(t("logoutDone"));
}

// ============================================================
// ŞİFRE
// ============================================================
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

async function handleChangePassword(e) {
  e.preventDefault();
  if (!currentUser) return;
  const fd = new FormData(e.target);
  const current = fd.get("current");
  const password = fd.get("password"), password2 = fd.get("password2");
  if (password !== password2) { toast(t("passwordMismatch")); return; }
  if (password.length < 6) { toast(t("passwordShort")); return; }
  if (current === password) { toast(t("passwordSame")); return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "…";
  const { error: signErr } = await db.auth.signInWithPassword({ email: currentUser.email, password: current });
  if (signErr) {
    btn.disabled = false; btn.textContent = t("saveNewPassword");
    toast(t("currentPasswordWrong")); return;
  }
  const { error } = await db.auth.updateUser({ password });
  btn.disabled = false; btn.textContent = t("saveNewPassword");
  if (error) { toast("Hata: " + error.message); return; }
  closeModal("changePasswordModal");
  e.target.reset();
  toast(t("passwordUpdated"), 4000);
}

// ============================================================
// ENGELLEME / ŞİKAYET
// ============================================================
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
  const { error } = await db.from("reports").insert({
    reporter_id: currentUser.id,
    reported_id: reportingUserId,
    reason,
    description
  });
  btn.disabled = false; btn.textContent = t("reportSend");
  if (error) { toast("Hata: " + error.message); return; }
  closeModal("reportModal");
  e.target.reset();
  reportingUserId = null;
  toast(t("reportSent"), 5000);
}

// ============================================================
// PROFİL DÜZENLE
// ============================================================
function openEditProfile() {
  if (!currentUser || !myProfile) return;
  pendingProfilePhoto = null;
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
  const preview = $("#editPhotoPreview");
  if (myProfile.avatar_url) {
    preview.style.background = `url('${myProfile.avatar_url}