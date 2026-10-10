// ============================================================
// ADMIN PANEL — Evlenmek İsteyenler
// ============================================================
const SUPABASE_URL = "https://mrlyghqqyvrdcwwmhpwj.supabase.co";
const SUPABASE_KEY = "sb_publishable_EW46ECy6Lv4Z1qJ_UPPx1A_JbU3G_rG";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const GRADS = ["linear-gradient(135deg,#e8437c,#c72c63)","linear-gradient(135deg,#6d3b8f,#9b5fc0)","linear-gradient(135deg,#2e9e8f,#1f7a6e)","linear-gradient(135deg,#e08c2e,#c06a12)","linear-gradient(135deg,#3b7dd8,#2a5aa0)","linear-gradient(135deg,#d84a6b,#a52e4d)","linear-gradient(135deg,#5a4bd8,#3f32a8)","linear-gradient(135deg,#0f9b8e,#0a6f66)"];
const grad = id => { let h = 0; for (let i = 0; i < (id || "").length; i++) h = (h + id.charCodeAt(i)) % GRADS.length; return GRADS[h]; };
const initials = n => String(n || "?").trim().split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();

let currentAdmin = null;
let usersCache = {};
let selectedUsers = new Set();
let usersPage = 1;
const USERS_PER_PAGE = 20;
let allUsersList = [];

// ============================================================
// TOAST
// ============================================================
function toast(msg, ms = 3500) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), ms);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
let confirmCallback = null;
function showConfirm(title, msg, onOk) {
  $("#confirmTitle").textContent = title;
  $("#confirmMsg").textContent = msg;
  $("#confirmOverlay").classList.add("open");
  confirmCallback = onOk;
}
function closeConfirm() {
  $("#confirmOverlay").classList.remove("open");
  confirmCallback = null;
}
document.addEventListener("DOMContentLoaded", () => {
  $("#confirmOkBtn").addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });
});

// ============================================================
// AUTH
// ============================================================
async function checkAdminAuth() {
  const { data } = await db.auth.getSession();
  if (!data.session) { showLogin(); return; }
  const userId = data.session.user.id;
  const { data: adminData } = await db.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!adminData) { showUnauthorized(data.session.user.email); return; }
  currentAdmin = data.session.user;
  showAdmin();
}

function showLogin() {
  $("#loginScreen").style.display = "flex";
  $("#unauthorizedScreen").style.display = "none";
  $("#adminShell").classList.remove("visible");
}
function showUnauthorized(email) {
  $("#loginScreen").style.display = "none";
  $("#unauthorizedScreen").style.display = "flex";
  $("#unauthorizedEmail").textContent = email;
  $("#adminShell").classList.remove("visible");
}

async function showAdmin() {
  $("#loginScreen").style.display = "none";
  $("#unauthorizedScreen").style.display = "none";
  $("#adminShell").classList.add("visible");

  const { data: prof } = await db.from("profiles").select("name, avatar_url").eq("id", currentAdmin.id).maybeSingle();
  const name = prof?.name || currentAdmin.email.split("@")[0];
  $("#adminName").textContent = name;
  $("#adminEmail").textContent = currentAdmin.email;

  const av = $("#adminAvatar");
  if (prof?.avatar_url) {
    av.style.background = `url('${prof.avatar_url}') center/cover`;
    av.textContent = "";
  } else {
    av.style.background = grad(currentAdmin.id);
    av.textContent = initials(name);
  }

  loadDashboard();
  loadReportsBadge();
  loadSettings();
}

async function adminLogout() {
  await db.auth.signOut();
  location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = $("#adminLoginForm");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const email = fd.get("email");
      const password = fd.get("password");
      const btn = form.querySelector("button[type=submit]");
      const note = $("#loginNote");
      note.textContent = "";
      btn.disabled = true; btn.textContent = "Giriş yapılıyor...";
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      btn.disabled = false; btn.textContent = "Giriş Yap";
      if (error) { note.textContent = "Hata: " + error.message; return; }
      const { data: adminData } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!adminData) { note.textContent = "Bu hesap admin yetkisine sahip değil."; await db.auth.signOut(); return; }
      currentAdmin = data.user;
      form.reset();
      showAdmin();
    });
  }
});

// ============================================================
// NAVİGASYON
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  $$(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      $$(".nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".page").forEach(p => p.classList.remove("active"));
      const target = $("#page-" + page);
      if (target) target.classList.add("active");
      if (page === "dashboard") loadDashboard();
      if (page === "users") loadUsers();
      if (page === "reports") loadReports();
      if (page === "messages") loadMessages();
      if (page === "blocks") loadBlocks();
      if (page === "settings") loadSettings();
    });
  });
});

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const { count: userCount } = await db.from("profiles").select("*", { count: "exact", head: true });
  $("#statUsers").textContent = userCount || 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: todayCount } = await db.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString());
  $("#statToday").textContent = todayCount || 0;

  const { count: repCount } = await db.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
  $("#statReports").textContent = repCount || 0;

  const { count: msgCount } = await db.from("messages").select("*", { count: "exact", head: true });
  $("#statMessages").textContent = msgCount || 0;

  const { count: likeCount } = await db.from("likes").select("*", { count: "exact", head: true });
  $("#statLikes").textContent = likeCount || 0;

  const { count: blockCount } = await db.from("blocks").select("*", { count: "exact", head: true });
  $("#statBlocks").textContent = blockCount || 0;

  const { data: recents } = await db.from("profiles").select("*").order("created_at", { ascending: false }).limit(6);
  if (!recents || !recents.length) {
    $("#recentUsers").innerHTML = "<p style='color:#888'>Henüz kullanıcı yok.</p>";
  } else {
    $("#recentUsers").innerHTML = recents.map(u => {
      const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
      const avContent = u.avatar_url ? "" : initials(u.name);
      const d = new Date(u.created_at);
      return `<div class="recent-item" style="cursor:pointer" onclick="openUserDetail('${u.id}')">
        <div class="av" style="${avStyle}">${avContent}</div>
        <div style="flex:1;min-width:0">
          <b>${esc(u.name)}, ${u.age}</b>
          <span>${esc(u.city || "—")} · ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}</span>
        </div>
      </div>`;
    }).join("");
  }
}

// ============================================================
// KULLANICILAR
// ============================================================
async function loadUsers() {
  const tbody = $("#usersTable");
  tbody.innerHTML = `<tr><td colspan="8" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) { tbody.innerHTML = `<tr><td colspan="8" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  allUsersList = data || [];
  allUsersList.forEach(u => usersCache[u.id] = u);
  usersPage = 1;
  renderUsers();
}

function getSortedFilteredUsers() {
  let list = [...allUsersList];
  const search = $("#userSearch").value.toLowerCase().trim();
  const filter = $("#userFilter").value;
  const sort = $("#userSort").value;

  if (search) {
    list = list.filter(u =>
      (u.name || "").toLowerCase().includes(search) ||
      (u.city || "").toLowerCase().includes(search) ||
      (u.job || "").toLowerCase().includes(search) ||
      (u.country || "").toLowerCase().includes(search)
    );
  }
  if (filter === "active") list = list.filter(u => !u.is_banned);
  if (filter === "banned") list = list.filter(u => u.is_banned);

  if (sort === "created_desc") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === "created_asc") list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (sort === "name_asc") list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
  if (sort === "age_asc") list.sort((a, b) => (a.age || 0) - (b.age || 0));
  if (sort === "age_desc") list.sort((a, b) => (b.age || 0) - (a.age || 0));

  return list;
}

function renderUsers() {
  const tbody = $("#usersTable");
  const list = getSortedFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(list.length / USERS_PER_PAGE));
  if (usersPage > totalPages) usersPage = totalPages;
  const start = (usersPage - 1) * USERS_PER_PAGE;
  const pageList = list.slice(start, start + USERS_PER_PAGE);

  if (!pageList.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">Kullanıcı bulunamadı.</td></tr>`;
    $("#usersPagination").innerHTML = "";
    return;
  }

  tbody.innerHTML = pageList.map(u => {
    const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
    const avContent = u.avatar_url ? "" : initials(u.name);
    const d = new Date(u.created_at);
    const status = u.is_banned ? '<span class="badge-pill badge-banned">⛔ Banlı</span>' : '<span class="badge-pill badge-active">✓ Aktif</span>';
    const photos = Array.isArray(u.photos) ? u.photos.slice(0, 4) : [];
    const photosHtml = photos.length > 0
      ? `<div class="user-photos-thumb">${photos.map(p => `<img src="${esc(p)}" alt="">`).join("")}</div>`
      : '<span style="color:#bbb;font-size:.8rem">—</span>';
    const isChecked = selectedUsers.has(u.id) ? "checked" : "";
    return `<tr>
      <td><input type="checkbox" class="row-check" ${isChecked} onchange="toggleUser('${u.id}', this.checked)"></td>
      <td>
        <div class="user-cell" style="cursor:pointer" onclick="openUserDetail('${u.id}')">
          <div class="av" style="${avStyle}">${avContent}</div>
          <div><b>${esc(u.name)}</b><span>${esc(u.country || "")} · ${esc(u.job || "—")}</span></div>
        </div>
      </td>
      <td>${u.age} · ${u.gender === "kadın" ? "Kadın" : u.gender === "erkek" ? "Erkek" : "—"}</td>
      <td>${esc(u.city || "—")}</td>
      <td>${photosHtml}</td>
      <td>${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}</td>
      <td>${status}</td>
      <td>
        <div class="action-btns">
          <button class="btn-ghost btn-sm" onclick="openUserDetail('${u.id}')">👁️ Detay</button>
          ${u.is_banned
            ? `<button class="btn-ghost btn-sm" onclick="adminUnban('${u.id}')">✅ Ban Kaldır</button>`
            : `<button class="btn-ghost btn-sm" style="color:#f39c12" onclick="adminBan('${u.id}')">⛔ Banla</button>`
          }
          <button class="btn-danger btn-sm" onclick="adminDeleteUser('${u.id}', '${esc(u.name)}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  renderPagination(totalPages);
  updateBulkBar();
}

function renderPagination(totalPages) {
  const el = $("#usersPagination");
  if (totalPages <= 1) { el.innerHTML = ""; return; }
  let html = `<button ${usersPage === 1 ? "disabled" : ""} onclick="gotoPage(${usersPage - 1})">←</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - usersPage) <= 2) {
      html += `<button class="${i === usersPage ? "active" : ""}" onclick="gotoPage(${i})">${i}</button>`;
    } else if (Math.abs(i - usersPage) === 3) {
      html += `<span style="padding:8px">...</span>`;
    }
  }
  html += `<button ${usersPage === totalPages ? "disabled" : ""} onclick="gotoPage(${usersPage + 1})">→</button>`;
  el.innerHTML = html;
}

function gotoPage(p) { usersPage = p; renderUsers(); window.scrollTo({ top: 0, behavior: "smooth" }); }

function toggleUser(id, checked) {
  if (checked) selectedUsers.add(id); else selectedUsers.delete(id);
  updateBulkBar();
}
function toggleSelectAll(el) {
  const list = getSortedFilteredUsers();
  const start = (usersPage - 1) * USERS_PER_PAGE;
  const pageList = list.slice(start, start + USERS_PER_PAGE);
  if (el.checked) pageList.forEach(u => selectedUsers.add(u.id));
  else pageList.forEach(u => selectedUsers.delete(u.id));
  renderUsers();
}
function clearSelection() {
  selectedUsers.clear();
  const selAll = $("#selectAllUsers"); if (selAll) selAll.checked = false;
  renderUsers();
}
function updateBulkBar() {
  const bar = $("#bulkBar");
  if (selectedUsers.size > 0) { bar.classList.add("show"); $("#bulkCount").textContent = selectedUsers.size; }
  else bar.classList.remove("show");
}

document.addEventListener("DOMContentLoaded", () => {
  const s = $("#userSearch"); if (s) s.addEventListener("input", () => { usersPage = 1; renderUsers(); });
  const f = $("#userFilter"); if (f) f.addEventListener("change", () => { usersPage = 1; renderUsers(); });
  const so = $("#userSort"); if (so) so.addEventListener("change", () => { usersPage = 1; renderUsers(); });
});

// ============================================================
// KULLANICI DETAY MODALI
// ============================================================
async function openUserDetail(userId) {
  const overlay = $("#userDetailOverlay");
  const box = $("#userDetailBox");
  box.innerHTML = `<div class="table-loading">Yükleniyor...</div>`;
  overlay.classList.add("open");

  const { data: u } = await db.from("profiles").select("*").eq("id", userId).single();
  if (!u) { box.innerHTML = "<p>Kullanıcı bulunamadı.</p>"; return; }

  // İstatistikler
  const { count: likesReceived } = await db.from("likes").select("*", { count: "exact", head: true }).eq("liked_id", userId);
  const { count: viewsReceived } = await db.from("profile_views").select("*", { count: "exact", head: true }).eq("viewed_id", userId);
  const { count: msgSent } = await db.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", userId);
  const { count: reportsAgainst } = await db.from("reports").select("*", { count: "exact", head: true }).eq("reported_id", userId);
  const { count: reportsMade } = await db.from("reports").select("*", { count: "exact", head: true }).eq("reporter_id", userId);

  // Son mesajlar
  const { data: msgs } = await db.from("messages").select("content, image_url, created_at, sender_id").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10);

  const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
  const avContent = u.avatar_url ? "" : initials(u.name);
  const photos = Array.isArray(u.photos) ? u.photos : [];
  const d = new Date(u.created_at);
  const ls = u.last_seen ? new Date(u.last_seen).toLocaleString('tr-TR') : "—";

  box.innerHTML = `
    <button class="close-detail" onclick="closeUserDetail()">✕</button>
    <div class="detail-head">
      <div class="av" style="${avStyle}">${avContent}</div>
      <div style="flex:1;min-width:0">
        <h2>${esc(u.name)}, ${u.age}</h2>
        <p>${esc(u.job || "—")} · ${esc(u.city || "—")}${u.country && u.country !== "Türkiye" ? ", " + esc(u.country) : ""}</p>
        <p style="margin-top:4px">${u.is_banned ? '<span class="badge-pill badge-banned">⛔ Banlı</span>' : '<span class="badge-pill badge-active">✓ Aktif</span>'}</p>
      </div>
    </div>

    <div class="detail-stat-row">
      <div class="detail-stat"><b>${likesReceived || 0}</b><span>Beğeni</span></div>
      <div class="detail-stat"><b>${viewsReceived || 0}</b><span>Ziyaret</span></div>
      <div class="detail-stat"><b>${msgSent || 0}</b><span>Mesaj</span></div>
      <div class="detail-stat"><b>${reportsAgainst || 0}</b><span>Şikayet Edilme</span></div>
      <div class="detail-stat"><b>${reportsMade || 0}</b><span>Şikayet Etme</span></div>
    </div>

    ${photos.length > 0 ? `<div class="detail-section"><h4>📷 Fotoğraflar (${photos.length})</h4><div class="detail-photos">${photos.map(p => `<img src="${esc(p)}" onclick="window.open('${esc(p)}','_blank')">`).join("")}</div></div>` : ""}

    <div class="detail-grid">
      <div class="item"><span>Cinsiyet</span><b>${u.gender === "kadın" ? "Kadın" : u.gender === "erkek" ? "Erkek" : "—"}</b></div>
      <div class="item"><span>Medeni Durum</span><b>${esc(u.marital_status || "—")}</b></div>
      <div class="item"><span>Eğitim</span><b>${esc(u.education || "—")}</b></div>
      <div class="item"><span>Boy / Kilo</span><b>${u.height || "—"} cm / ${u.weight || "—"} kg</b></div>
      <div class="item"><span>İlgi Alanları</span><b>${(u.interests || []).join(", ") || "—"}</b></div>
      <div class="item"><span>Kayıt Tarihi</span><b>${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}</b></div>
      <div class="item"><span>Son Görülme</span><b>${ls}</b></div>
      <div class="item"><span>Kullanıcı ID</span><b style="font-size:.72rem;word-break:break-all">${u.id}</b></div>
    </div>

    ${u.bio ? `<div class="detail-section"><h4>📝 Hakkında</h4><div class="bio-box">${esc(u.bio)}</div></div>` : ""}

    ${msgs && msgs.length > 0 ? `<div class="detail-section"><h4>💬 Son Mesajlar (${msgs.length})</h4>
      <div class="msg-history">
        ${msgs.map(m => {
          const md = new Date(m.created_at);
          const timeStr = `${md.getDate()}.${md.getMonth()+1} ${md.getHours().toString().padStart(2,"0")}:${md.getMinutes().toString().padStart(2,"0")}`;
          const isSender = m.sender_id === u.id;
          return `<div class="item"><b>${isSender ? "→" : "←"}</b> ${esc((m.content || "").slice(0, 80) || "📷 Resim")} <span style="color:#999;font-size:.75rem">· ${timeStr}</span></div>`;
        }).join("")}
      </div>
    </div>` : ""}

    <div class="detail-actions">
      ${u.is_banned
        ? `<button class="btn-ghost btn-sm" onclick="adminUnban('${u.id}'); closeUserDetail();">✅ Ban Kaldır</button>`
        : `<button class="btn-ghost btn-sm" style="color:#f39c12" onclick="adminBan('${u.id}'); closeUserDetail();">⛔ Banla</button>`
      }
      <button class="btn-danger btn-sm" onclick="adminDeleteUser('${u.id}', '${esc(u.name)}'); closeUserDetail();">🗑️ Kullanıcıyı Sil</button>
    </div>
  `;
}

function closeUserDetail() {
  $("#userDetailOverlay").classList.remove("open");
}

// ============================================================
// KULLANICI AKSİYONLARI
// ============================================================
async function adminBan(userId) {
  const u = usersCache[userId];
  showConfirm("Kullanıcıyı Banla", `${u?.name || "Bu kullanıcı"} adlı kullanıcıyı banlamak istediğine emin misin?`, async () => {
    const { error } = await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).eq("id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    if (usersCache[userId]) usersCache[userId].is_banned = true;
    toast("✓ Kullanıcı banlandı");
    loadUsers();
    loadDashboard();
  });
}

async function adminUnban(userId) {
  const u = usersCache[userId];
  showConfirm("Banı Kaldır", `${u?.name || "Bu kullanıcı"} adlı kullanıcının banını kaldırmak istediğine emin misin?`, async () => {
    const { error } = await db.from("profiles").update({ is_banned: false, banned_at: null }).eq("id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    if (usersCache[userId]) usersCache[userId].is_banned = false;
    toast("✓ Ban kaldırıldı");
    loadUsers();
    loadDashboard();
  });
}

async function adminDeleteUser(userId, name) {
  showConfirm("Kullanıcıyı Sil", `${name} adlı kullanıcıyı tamamen silmek istediğine emin misin? Bu işlem GERİ ALINAMAZ.`, async () => {
    const { error } = await db.from("profiles").delete().eq("id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    delete usersCache[userId];
    selectedUsers.delete(userId);
    toast("✓ Kullanıcı silindi");
    loadUsers();
    loadDashboard();
  });
}

// Toplu işlemler
async function bulkBan() {
  if (!selectedUsers.size) return;
  showConfirm("Toplu Ban", `${selectedUsers.size} kullanıcıyı banlamak istediğine emin misin?`, async () => {
    const ids = Array.from(selectedUsers);
    const { error } = await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).in("id", ids);
    if (error) { toast("Hata: " + error.message); return; }
    ids.forEach(id => { if (usersCache[id]) usersCache[id].is_banned = true; });
    toast(`✓ ${ids.length} kullanıcı banlandı`);
    selectedUsers.clear();
    loadUsers();
    loadDashboard();
  });
}
async function bulkUnban() {
  if (!selectedUsers.size) return;
  showConfirm("Toplu Ban Kaldır", `${selectedUsers.size} kullanıcının banını kaldırmak istediğine emin misin?`, async () => {
    const ids = Array.from(selectedUsers);
    const { error } = await db.from("profiles").update({ is_banned: false, banned_at: null }).in("id", ids);
    if (error) { toast("Hata: " + error.message); return; }
    ids.forEach(id => { if (usersCache[id]) usersCache[id].is_banned = false; });
    toast(`✓ ${ids.length} kullanıcının banı kaldırıldı`);
    selectedUsers.clear();
    loadUsers();
    loadDashboard();
  });
}
async function bulkDelete() {
  if (!selectedUsers.size) return;
  showConfirm("Toplu Sil", `${selectedUsers.size} kullanıcıyı tamamen silmek istediğine emin misin? GERİ ALINAMAZ.`, async () => {
    const ids = Array.from(selectedUsers);
    const { error } = await db.from("profiles").delete().in("id", ids);
    if (error) { toast("Hata: " + error.message); return; }
    ids.forEach(id => delete usersCache[id]);
    toast(`✓ ${ids.length} kullanıcı silindi`);
    selectedUsers.clear();
    loadUsers();
    loadDashboard();
  });
}

// ============================================================
// ŞİKAYETLER
// ============================================================
async function loadReportsBadge() {
  const { count } = await db.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
  const b = $("#reportsBadge");
  if (b) {
    if (count > 0) { b.textContent = count; b.style.display = "inline-block"; }
    else b.style.display = "none";
  }
}

async function loadReports() {
  const list = $("#reportsList");
  list.innerHTML = `<div class="table-loading">Yükleniyor...</div>`;
  const filter = $("#reportFilter").value;
  let q = db.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) { list.innerHTML = `<div class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</div>`; return; }
  const reports = data || [];
  if (!reports.length) { list.innerHTML = `<div class="table-loading">Şikayet yok.</div>`; return; }

  const ids = new Set();
  reports.forEach(r => { ids.add(r.reporter_id); ids.add(r.reported_id); });
  const { data: users } = await db.from("profiles").select("id,name,avatar_url,city,is_banned").in("id", Array.from(ids));
  const uMap = {};
  (users || []).forEach(u => uMap[u.id] = u);

  const reasonLabels = {
    inappropriate: "Uygunsuz içerik / fotoğraf", spam: "Spam / Reklam",
    fake: "Sahte hesap", harassment: "Taciz / Hakaret",
    scam: "Dolandırıcılık", married: "Evli olduğu halde üye", other: "Diğer"
  };

  list.innerHTML = reports.map(r => {
    const reporter = uMap[r.reporter_id] || { name: "?" };
    const reported = uMap[r.reported_id] || { name: "?" };
    const repAvStyle = reporter.avatar_url ? `background:url('${esc(reporter.avatar_url)}') center/cover` : `background:${grad(r.reporter_id)}`;
    const repdAvStyle = reported.avatar_url ? `background:url('${esc(reported.avatar_url)}') center/cover` : `background:${grad(r.reported_id)}`;
    const repAvContent = reporter.avatar_url ? "" : initials(reporter.name);
    const repdAvContent = reported.avatar_url ? "" : initials(reported.name);
    const d = new Date(r.created_at);
    const dateStr = `${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    const statusClass = r.status === "pending" ? "badge-pending" : r.status === "approved" ? "badge-approved" : "badge-rejected";
    const statusText = r.status === "pending" ? "Bekliyor" : r.status === "approved" ? "Onaylandı" : "Reddedildi";
    const reportedBanned = reported.is_banned ? ' <span class="badge-pill badge-banned" style="margin-left:6px">⛔ Banlı</span>' : "";

    return `<div class="report-card">
      <div class="report-head">
        <div class="report-users">
          <div class="report-user" style="cursor:pointer" onclick="openUserDetail('${r.reporter_id}')">
            <div class="av" style="${repAvStyle}">${repAvContent}</div>
            <div><b>${esc(reporter.name)}</b><span>Şikayet eden</span></div>
          </div>
          <div class="report-arrow">→</div>
          <div class="report-user" style="cursor:pointer" onclick="openUserDetail('${r.reported_id}')">
            <div class="av" style="${repdAvStyle}">${repdAvContent}</div>
            <div><b>${esc(reported.name)}${reportedBanned}</b><span>Şikayet edilen</span></div>
          </div>
        </div>
        <span class="badge-pill ${statusClass}">${statusText}</span>
      </div>
      <div class="report-meta">
        <span>📋 <b>Sebep:</b> ${reasonLabels[r.reason] || r.reason}</span>
        <span>·</span>
        <span>🕐 ${dateStr}</span>
      </div>
      ${r.description ? `<div class="report-desc">"${esc(r.description)}"</div>` : ""}
      ${r.status === "pending" ? `
        <div class="report-actions">
          <button class="btn-primary btn-sm" onclick="approveReport(${r.id})">✓ Onayla</button>
          <button class="btn-danger btn-sm" onclick="banAndApprove(${r.id}, '${r.reported_id}', '${esc(reported.name)}')">⛔ Banla & Onayla</button>
          <button class="btn-ghost btn-sm" onclick="rejectReport(${r.id})">✕ Reddet</button>
        </div>
      ` : ""}
    </div>`;
  }).join("");
}

async function approveReport(id) {
  const { error } = await db.from("reports").update({ status: "approved" }).eq("id", id);
  if (error) { toast("Hata: " + error.message); return; }
  toast("✓ Şikayet onaylandı");
  loadReports(); loadReportsBadge();
}
async function rejectReport(id) {
  const { error } = await db.from("reports").update({ status: "rejected" }).eq("id", id);
  if (error) { toast("Hata: " + error.message); return; }
  toast("✓ Şikayet reddedildi");
  loadReports(); loadReportsBadge();
}
async function banAndApprove(reportId, userId, name) {
  showConfirm("Banla & Onayla", `${name} adlı kullanıcıyı banlamak ve şikayeti onaylamak istediğine emin misin?`, async () => {
    await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).eq("id", userId);
    await db.from("reports").update({ status: "approved" }).eq("id", reportId);
    toast("✓ Kullanıcı banlandı ve şikayet onaylandı");
    loadReports(); loadReportsBadge(); loadDashboard();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const f = $("#reportFilter"); if (f) f.addEventListener("change", loadReports);
});

// ============================================================
// MESAJLAR
// ============================================================
let allMessages = [];
async function loadMessages() {
  const tbody = $("#messagesTable");
  tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("messages").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  allMessages = data || [];
  if (!allMessages.length) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Henüz mesaj yok.</td></tr>`; return; }

  const ids = new Set();
  allMessages.forEach(m => { ids.add(m.sender_id); ids.add(m.receiver_id); });
  const { data: users } = await db.from("profiles").select("id,name").in("id", Array.from(ids));
  const uMap = {};
  (users || []).forEach(u => uMap[u.id] = u);
  window.__msgUserMap = uMap;
  renderMessages(allMessages);
}

function renderMessages(msgs) {
  const tbody = $("#messagesTable");
  const uMap = window.__msgUserMap || {};
  if (!msgs.length) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Sonuç yok.</td></tr>`; return; }
  tbody.innerHTML = msgs.map(m => {
    const sName = uMap[m.sender_id]?.name || "?";
    const rName = uMap[m.receiver_id]?.name || "?";
    const d = new Date(m.created_at);
    const dateStr = `${d.getDate()}.${d.getMonth()+1} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    const content = m.content ? esc(m.content).slice(0, 80) : (m.image_url ? "📷 Resim" : "—");
    return `<tr>
      <td><b>${esc(sName)}</b></td>
      <td>${esc(rName)}</td>
      <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${content}</td>
      <td style="color:#888;font-size:.82rem">${dateStr}</td>
    </tr>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const s = $("#msgSearch");
  if (s) s.addEventListener("input", () => {
    const q = s.value.toLowerCase().trim();
    const uMap = window.__msgUserMap || {};
    let list = allMessages;
    if (q) {
      list = allMessages.filter(m => {
        const sName = (uMap[m.sender_id]?.name || "").toLowerCase();
        const rName = (uMap[m.receiver_id]?.name || "").toLowerCase();
        const content = (m.content || "").toLowerCase();
        return sName.includes(q) || rName.includes(q) || content.includes(q);
      });
    }
    renderMessages(list);
  });
});

// ============================================================
// ENGELLEMELER
// ============================================================
async function loadBlocks() {
  const tbody = $("#blocksTable");
  tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("blocks").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  const blocks = data || [];
  if (!blocks.length) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Henüz engelleme yok.</td></tr>`; return; }

  const ids = new Set();
  blocks.forEach(b => { ids.add(b.blocker_id); ids.add(b.blocked_id); });
  const { data: users } = await db.from("profiles").select("id,name").in("id", Array.from(ids));
  const uMap = {};
  (users || []).forEach(u => uMap[u.id] = u);

  tbody.innerHTML = blocks.map(b => {
    const d = new Date(b.created_at);
    const dateStr = `${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`;
    return `<tr>
      <td><b>${esc(uMap[b.blocker_id]?.name || "?")}</b></td>
      <td><b>${esc(uMap[b.blocked_id]?.name || "?")}</b></td>
      <td style="color:#888;font-size:.82rem">${dateStr}</td>
      <td style="text-align:right">
        <button class="btn-ghost btn-sm" onclick="adminUnblock('${b.blocker_id}', '${b.blocked_id}')">🔓 Engeli Kaldır</button>
      </td>
    </tr>`;
  }).join("");
}

async function adminUnblock(blockerId, blockedId) {
  showConfirm("Engeli Kaldır", "Bu engeli kaldırmak istediğine emin misin?", async () => {
    const { error } = await db.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
    if (error) { toast("Hata: " + error.message); return; }
    toast("✓ Engel kaldırıldı");
    loadBlocks();
  });
}

// ============================================================
// AYARLAR
// ============================================================
async function loadSettings() {
  const { data } = await db.from("site_settings").select("*");
  const map = {};
  (data || []).forEach(s => map[s.key] = s.value);
  if (map.siteName) $("#set-siteName").value = map.siteName;
  if (map.contactEmail) $("#set-contactEmail").value = map.contactEmail;
  if (map.maintenance) $("#set-maintenance").value = map.maintenance;
}

async function saveSettings() {
  const settings = [
    { key: "siteName", value: $("#set-siteName").value },
    { key: "contactEmail", value: $("#set-contactEmail").value },
    { key: "maintenance", value: $("#set-maintenance").value }
  ];
  for (const s of settings) {
    const { error } = await db.from("site_settings").upsert({
      key: s.key, value: s.value, updated_at: new Date().toISOString()
    }, { onConflict: "key" });
    if (error) { toast("Hata: " + error.message); return; }
  }
  toast("✓ Ayarlar kaydedildi");
}

async function clearAllReports() {
  showConfirm("Tüm Şikayetleri Temizle", "Tüm şikayet kayıtları silinecek. GERİ ALINAMAZ. Emin misin?", async () => {
    const { error } = await db.from("reports").delete().neq("id", 0);
    if (error) { toast("Hata: " + error.message); return; }
    toast("✓ Tüm şikayetler temizlendi");
    loadReports(); loadReportsBadge(); loadDashboard();
  });
}

// ============================================================
// MODAL KAPATMA (Overlay Tıklaması)
// ============================================================
document.addEventListener("click", e => {
  if (e.target.id === "userDetailOverlay") closeUserDetail();
  if (e.target.id === "reportDetailOverlay") $("#reportDetailOverlay").classList.remove("open");
});

// ============================================================
// BAŞLAT
// ============================================================
(async function init() {
  db.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") showLogin();
    else if (event === "SIGNED_IN") checkAdminAuth();
  });
  await checkAdminAuth();
})();