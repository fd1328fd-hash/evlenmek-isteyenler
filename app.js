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

let currentUser = null, myProfile = null, myLikes = new Set(), allProfiles = [], unreadCount = 0;
let activeConvUserId = null, realtimeChannel = null, allUsers = {}, pendingImage = null, pendingProfilePhoto = null;

// ============================================================
// TOAST (BİLDİRİM)
// ============================================================
function toast(msg, ms = 3500) {
  const el = $("#toast");
  el.innerHTML = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), ms);
}

// ============================================================
// BEKLEYEN PROFİL (mail onayı bekleyen kullanıcılar için)
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
// MODAL KONTROL
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
    await initRealtime();
    await refreshUnreadCount();
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

// ============================================================
// NAVBAR
// ============================================================
function updateNavbar() {
  const nav = $("#navActions");
  if (currentUser && myProfile) {
    const badge = unreadCount > 0 ? `<span class="badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : "";
    const avStyle = myProfile.avatar_url ? `background:url('${esc(myProfile.avatar_url)}') center/cover` : `background:${grad(currentUser.id)}`;
    const avContent = myProfile.avatar_url ? "" : initials(myProfile.name);
    nav.innerHTML = `
      <button class="icon-btn" data-action="open-messages">💬${badge}</button>
      <button class="icon-btn" data-action="open-edit-profile">⚙️</button>
      <div class="user-badge" data-action="open-edit-profile">
        <div class="avatar" style="${avStyle}">${avContent}</div>
        <span class="hide-mobile">${esc(myProfile.name)}</span>
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
// REALTIME — YENİ MESAJ GELİNCE OTOMATİK KAYDIRMA
// ============================================================
async function initRealtime() {
  if (!currentUser) return;
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel("messages-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${currentUser.id}` }, payload => {
      const msg = payload.new;
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
  if (filters.gender && filters.gender !== "hepsi") q = q.eq("gender", filters.gender);
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
  list = list.filter(p => p.id !== currentUser.id);
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
    const liked = myLikes.has(p.id);
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
        <button class="like-btn ${liked ? "liked" : ""}" data-action="toggle-like" data-id="${p.id}">${liked ? "♥" : "♡"}</button>
        <button class="like-btn" data-action="start-chat" data-id="${p.id}">💬</button>
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
  closeAllModals();
  updateNavbar(); updateProfileSection();
  await initRealtime(); loadProfiles();
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
  await loadMyProfile(); await applyPendingProfile(); await loadMyLikes();
  await initRealtime(); await refreshUnreadCount();
  closeAllModals();
  updateNavbar(); updateProfileSection(); loadProfiles();
  toast(t("loginSuccess"));
}

async function handleLogout() {
  if (realtimeChannel) { db.removeChannel(realtimeChannel); realtimeChannel = null; }
  await db.auth.signOut();
  currentUser = null; myProfile = null; myLikes = new Set(); unreadCount = 0;
  activeConvUserId = null;
  cancelPendingImage(); cancelPendingProfilePhoto();
  closeMessages();
  updateNavbar(); updateProfileSection();
  toast(t("logoutDone"));
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
    preview.style.background = `url('${myProfile.avatar_url}') center/cover`;
    preview.textContent = "";
    $("#editPhotoRemoveBtn").style.display = "inline-flex";
  } else {
    preview.style.background = `linear-gradient(135deg,var(--rose),var(--plum))`;
    preview.textContent = initials(myProfile.name);
    $("#editPhotoRemoveBtn").style.display = "none";
  }
  openModal("editProfileModal");
}

function cancelPendingProfilePhoto() {
  if (pendingProfilePhoto) { URL.revokeObjectURL(pendingProfilePhoto.url); pendingProfilePhoto = null; }
  const fi = $("#editPhotoInput"); if (fi) fi.value = "";
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
  let avatar_url = myProfile.avatar_url || null;
  if (pendingProfilePhoto) {
    toast(t("uploading"), 2500);
    const file = pendingProfilePhoto.file;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${currentUser.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from("chat-images").upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (upErr) { btn.disabled = false; btn.textContent = t("save"); toast("Hata: " + upErr.message); return; }
    const { data: urlData } = db.storage.from("chat-images").getPublicUrl(fileName);
    avatar_url = urlData.publicUrl;
  }
  const updateData = { name: data.name, age: data.age, gender: data.gender, country: data.country, city: data.city, job: data.job || "", bio: data.bio || "", marital_status: data.marital_status || "Bekar", height: data.height, weight: data.weight, education: data.education || "", interests: data.interests, avatar_url };
  const { error } = await db.from("profiles").update(updateData).eq("id", currentUser.id);
  if (error) { btn.disabled = false; btn.textContent = t("save"); toast("Hata: " + error.message); return; }
  myProfile = { ...myProfile, ...updateData };
  cancelPendingProfilePhoto();
  btn.disabled = false; btn.textContent = t("save");
  closeModal("editProfileModal");
  updateNavbar(); loadProfiles();
  toast(t("profileUpdated"));
}

function handleEditPhotoPick(e) {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast(t("imageTooBig")); e.target.value = ""; return; }
  if (!file.type.startsWith("image/")) { toast(t("pickImage")); e.target.value = ""; return; }
  if (pendingProfilePhoto) URL.revokeObjectURL(pendingProfilePhoto.url);
  const url = URL.createObjectURL(file);
  pendingProfilePhoto = { file, url };
  const preview = $("#editPhotoPreview");
  preview.style.background = `url('${url}') center/cover`;
  preview.textContent = "";
  $("#editPhotoRemoveBtn").style.display = "inline-flex";
  e.target.value = "";
}

// ============================================================
// BEĞENİ
// ============================================================
async function toggleLike(id) {
  if (!currentUser || !myProfile) { toast(t("lockedTitle")); openModal("registerModal"); return; }
  if (currentUser.id === id) return;
  if (myLikes.has(id)) {
    await db.from("likes").delete().eq("liker_id", currentUser.id).eq("liked_id", id);
    myLikes.delete(id);
  } else {
    const { error } = await db.from("likes").insert({ liker_id: currentUser.id, liked_id: id });
    if (error) { toast("Hata: " + error.message); return; }
    myLikes.add(id);
  }
  loadProfiles(getCurrentFilters());
}

// ============================================================
// FİLTRELER
// ============================================================
function getCurrentFilters() {
  return {
    gender: $("#f-gender").value,
    country: $("#f-country").value,
    city: $("#f-city").value.trim(),
    marital: $("#f-marital").value,
    education: $("#f-education").value,
    ageMin: +$("#f-age-min").value || 18,
    ageMax: +$("#f-age-max").value || 99,
    heightMin: +$("#f-height-min").value || null,
    heightMax: +$("#f-height-max").value || null,
    weightMin: +$("#f-weight-min").value || null,
    weightMax: +$("#f-weight-max").value || null,
    search: $("#f-search").value.trim()
  };
}
function applyFilters() { loadProfiles(getCurrentFilters()); }
function resetFilters() {
  $("#f-gender").value = "hepsi"; $("#f-country").value = "hepsi";
  $("#f-city").value = ""; $("#dl-f-city").innerHTML = "";
  $("#f-marital").value = "hepsi"; $("#f-education").value = "hepsi";
  $("#f-age-min").value = 18; $("#f-age-max").value = 99;
  $("#f-height-min").value = ""; $("#f-height-max").value = "";
  $("#f-weight-min").value = ""; $("#f-weight-max").value = "";
  $("#f-search").value = "";
  loadProfiles();
}
function quickSearch() {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  const gender = $("#q-gender").value;
  const min = +$("#q-min").value || 18;
  const max = +$("#q-max").value || 99;
  $("#f-gender").value = gender;
  $("#f-age-min").value = min;
  $("#f-age-max").value = max;
  loadProfiles({ gender, ageMin: min, ageMax: max });
  document.getElementById("profiller").scrollIntoView({ behavior: "smooth" });
}

// ============================================================
// PROFİL DETAY
// ============================================================
async function viewProfile(id) {
  if (!currentUser || !myProfile) { openModal("registerModal"); return; }
  const { data: p, error } = await db.from("profiles").select("*").eq("id", id).single();
  if (error || !p) { toast("Bulunamadı"); return; }
  const liked = myLikes.has(p.id);
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
  $("#detailBody").innerHTML = `
    <button class="close-x" data-action="close-modal" data-modal="detailModal">✕</button>
    <div class="card-top" style="margin-bottom:20px">
      <div class="avatar" style="${avStyle};width:78px;height:78px;font-size:1.5rem;border-radius:22px">${avContent}</div>
      <div style="min-width:0;flex:1">
        <h3 style="font-size:1.3rem">${esc(p.name)}, ${p.age}</h3>
        <div class="meta">${esc(p.job || "—")} · ${esc(p.city)}</div>
      </div>
    </div>
    ${details.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">${details.join("")}</div>` : ""}
    <h5 style="font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${t("aboutSection")}</h5>
    <p style="font-size:.92rem;background:#fbf7fa;padding:16px;border-radius:14px;margin-bottom:18px">${esc(p.bio || "—")}</p>
    <h5 style="font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${t("interestsSection")}</h5>
    <div class="tags" style="margin-bottom:20px">
      ${(p.interests || []).map(x => `<span class="tag">${esc(x)}</span>`).join("") || "<span style='color:var(--muted);font-size:.86rem'>—</span>"}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn ${liked ? "btn-ghost" : "btn-primary"}" data-action="toggle-like-modal" data-id="${p.id}" style="flex:1;min-width:120px">
        ${liked ? "♥" : "♡"} ${t("likeBtn")}
      </button>
      <button class="btn btn-primary" data-action="start-chat" data-id="${p.id}" style="flex:1;min-width:120px">${t("messageBtn")}</button>
    </div>`;
  openModal("detailModal");
}

// ============================================================
// MESAJLAŞMA
// ============================================================
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
}

async function refreshConversationList() {
  if (!currentUser) return;
  const { data, error } = await db.from("messages").select("*").or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order("created_at", { ascending: false }).limit(500);
  if (error) return;
  const convs = {};
  (data || []).forEach(m => {
    const otherId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
    if (!convs[otherId]) convs[otherId] = { last: m, unread: 0 };
    if (m.receiver_id === currentUser.id && !m.is_read) convs[otherId].unread++;
  });
  const list = Object.entries(convs).sort((a, b) => new Date(b[1].last.created_at) - new Date(a[1].last.created_at));
  const el = $("#convList");
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
  const d = new Date(iso), now = new Date(), diff = (now - d) / 1000;
  if (diff < 60) return "şimdi";
  if (diff < 3600) return Math.floor(diff / 60) + " dk";
  if (diff < 86400) return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  return d.getDate() + "." + (d.getMonth() + 1);
}

async function openConversation(otherId) {
  if (!otherId) return;
  activeConvUserId = otherId;
  if (!allUsers[otherId]) {
    const { data } = await db.from("profiles").select("*").eq("id", otherId).single();
    if (data) allUsers[otherId] = data;
  }
  const u = allUsers[otherId] || { name: "?" };
  const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(otherId)}`;
  const avContent = u.avatar_url ? "" : initials(u.name);
  $("#msgMain").innerHTML = `
    <div class="msg-head">
      <button class="icon-btn" id="msgBack" data-action="msg-back" style="display:none">←</button>
      <div class="avatar" style="${avStyle}">${avContent}</div>
      <div class="msg-head-info"><b>${esc(u.name)}</b><span>${t("online")}</span></div>
      <button class="icon-btn" data-action="close-messages">✕</button>
    </div>
    <div class="msg-body" id="msgBody"></div>
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
  const input = $("#msgInput");
  input.focus();
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 100) + "px"; });
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

// ============================================================
// MESAJ EKLEME — RESİM YÜKLENİNCE OTOMATİK KAYDIRMA
// ============================================================
function appendMessage(m, scroll = true) {
  const body = $("#msgBody"); if (!body) return;
  const isMe = m.sender_id === currentUser.id;
  const div = document.createElement("div");
  div.className = "msg " + (isMe ? "me" : "them");
  if (m.id && !String(m.id).startsWith("temp-")) div.dataset.msgId = m.id;
  const time = new Date(m.created_at);
  const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
  let inner = "";
  if (m.image_url) inner += `<img src="${esc(m.image_url)}" data-action="open-lightbox" data-url="${esc(m.image_url)}" loading="lazy">`;
  if (m.content) inner += escapeText(m.content);
  inner += `<time>${timeStr}</time>`;
  if (isMe && m.id && !String(m.id).startsWith("temp-")) inner += `<button class="msg-del" data-action="delete-msg" data-id="${m.id}">✕</button>`;
  div.innerHTML = inner;
  body.appendChild(div);
  if (scroll) {
    scrollToBottom();
    div.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => { if (scroll) scrollToBottom(); });
      }
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
  const content = input.value.trim();
  if (!content && !pendingImage) return;
  const sendBtn = $(".msg-send");
  if (sendBtn) sendBtn.disabled = true;
  let imageUrl = null;
  if (pendingImage) {
    toast(t("uploading"), 2000);
    const file = pendingImage.file;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from("chat-images").upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      toast("Hata: " + upErr.message);
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
    const { data: urlData } = db.storage.from("chat-images").getPublicUrl(fileName);
    imageUrl = urlData.publicUrl;
  }
  const { data: inserted, error } = await db.from("messages").insert({
    sender_id: currentUser.id,
    receiver_id: activeConvUserId,
    content: content || "",
    image_url: imageUrl
  }).select().single();
  if (error) {
    toast("Hata: " + error.message);
    if (sendBtn) sendBtn.disabled = false;
    return;
  }
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
  closeModal("detailModal");
  openMessages();
  await openConversation(userId);
}

function openLightbox(url) { $("#lightboxImg").src = url; $("#lightbox").classList.add("open"); }
function closeLightbox() { $("#lightbox").classList.remove("open"); $("#lightboxImg").src = ""; }

// ============================================================
// TIKLAMA YÖNETİCİSİ
// ============================================================
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
    case "close-modal": closeModal(modal); break;
    case "open-edit-profile": closeAllModals(); openEditProfile(); break;
    case "pick-edit-photo": $("#editPhotoInput").click(); break;
    case "remove-edit-photo": {
      cancelPendingProfilePhoto();
      const prev = $("#editPhotoPreview");
      prev.style.backgroundImage = "";
      prev.style.background = `linear-gradient(135deg,var(--rose),var(--plum))`;
      prev.textContent = initials(myProfile.name);
      $("#editPhotoRemoveBtn").style.display = "none";
      myProfile.avatar_url = null;
      break;
    }
    case "logout": await handleLogout(); break;
    case "toggle-like": await toggleLike(id); break;
    case "toggle-like-modal": await toggleLike(id); await viewProfile(id); break;
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
  }
});

$$(".overlay").forEach(ov => {
  ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id); });
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeAllModals();
    closeLightbox();
    if ($("#msgOverlay").classList.contains("open")) closeMessages();
  }
});

// ============================================================
// FORM BAĞLAMALARI
// ============================================================
$("#registerForm").addEventListener("submit", handleRegister);
$("#loginForm").addEventListener("submit", handleLogin);
$("#editProfileForm").addEventListener("submit", handleEditProfile);
$("#editPhotoInput").addEventListener("change", handleEditPhotoPick);

document.addEventListener("change", e => {
  const map = { "r-country": "r-city", "e-country": "e-city", "f-country": "f-city" };
  const cityId = map[e.target.id];
  if (cityId) {
    const cityEl = $("#" + cityId);
    if (cityEl) cityEl.value = "";
    updateCityDropdown(e.target.id, cityId);
  }
});

// ============================================================
// BAŞLAT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("langBtn");
  const menu = document.getElementById("langMenu");
  if (btn && menu) {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", () => menu.classList.remove("open"));
    menu.addEventListener("click", e => {
      const opt = e.target.closest("[data-lang]");
      if (opt) { setLanguage(opt.dataset.lang); menu.classList.remove("open"); }
    });
  }
});

(async function init() {
  fillCountriesAndCities();
  const l = LANGS.find(x => x.code === currentLang) || LANGS[0];
  const flagEl = document.getElementById("langFlag");
  const nameEl = document.getElementById("langName");
  if (flagEl) flagEl.textContent = l.flag;
  if (nameEl) nameEl.textContent = l.name;
  document.documentElement.dir = (currentLang === "ar" || currentLang === "fa" || currentLang === "ku") ? "rtl" : "ltr";
  document.documentElement.lang = currentLang;
  buildLangMenu();
  applyTranslations();

  db.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
      currentUser = null; myProfile = null; myLikes = new Set(); unreadCount = 0;
      if (realtimeChannel) { db.removeChannel(realtimeChannel); realtimeChannel = null; }
      updateNavbar();
      updateProfileSection();
    } else if (event === "SIGNED_IN") {
      const { data } = await db.auth.getSession();
      if (data.session) {
        currentUser = data.session.user;
        await loadMyProfile();
        await applyPendingProfile();
        updateNavbar();
        updateProfileSection();
        loadProfiles();
      }
    }
  });

  await checkSession();
  await loadProfiles();
})();