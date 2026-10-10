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
let usersList = [];
let selectedUsers = new Set();
let usersPage = 1;
let usersPerPage = 20;

let messagesList = [];
let messagesPage = 1;
let messagesPerPage = 20;
let messageSearchTerm = "";

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
// CONFIRM
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
  const okBtn = $("#confirmOkBtn");
  if (okBtn) okBtn.addEventListener("click", () => { if (confirmCallback) confirmCallback(); closeConfirm(); });
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
  if (prof?.avatar_url) { av.style.background = `url('${prof.avatar_url}') center/cover`; av.textContent = ""; }
  else { av.style.background = grad(currentAdmin.id); av.textContent = initials(name); }
  loadDashboard();
  loadReportsBadge();
}
async function adminLogout() { await db.auth.signOut(); location.reload(); }

document.addEventListener("DOMContentLoaded", () => {
  const form = $("#adminLoginForm");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const email = fd.get("email"), password = fd.get("password");
      const btn = form.querySelector("button[type=submit]");
      const note = $("#loginNote");
      note.textContent = "";
      btn.disabled = true; btn.textContent = "Giriş yapılıyor...";
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      btn.disabled = false; btn.textContent = "Giriş Yap";
      if (error) { note.textContent = "Hata: " + error.message; return; }
      const { data: adminData } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!adminData) { note.textContent = "Bu hesap admin yetkisine sahip değil."; await db.auth.signOut(); return; }
      currentAdmin = data.user; form.reset(); showAdmin();
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
  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
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
  if (!recents || !recents.length) { $("#recentUsers").innerHTML = "<p style='color:#888'>Henüz kullanıcı yok.</p>"; }
  else {
    $("#recentUsers").innerHTML = recents.map(u => {
      const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
      const avContent = u.avatar_url ? "" : initials(u.name);
      const d = new Date(u.created_at);
      return `<div class="recent-item"><div class="av" style="${avStyle}">${avContent}</div><div style="flex:1;min-width:0"><b>${esc(u.name)}, ${u.age}</b><span>${esc(u.city || "—")} · ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}</span></div></div>`;
    }).join("");
  }
}

// ============================================================
// KULLANICILAR
// ============================================================
async function loadUsers() {
  const tbody = $("#usersTable");
  tbody.innerHTML = `<tr><td colspan="7" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) { tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  usersList = data || [];
  usersList.forEach(u => usersCache[u.id] = u);
  selectedUsers.clear();
  usersPage = 1;
  renderUsers();
}

function renderUsers() {
  const tbody = $("#usersTable");
  const search = ($("#userSearch")?.value || "").toLowerCase().trim();
  const filter = $("#userFilter")?.value || "all";

  let list = usersList.slice();
  if (search) list = list.filter(u => (u.name||"").toLowerCase().includes(search) || (u.city||"").toLowerCase().includes(search) || (u.job||"").toLowerCase().includes(search));
  if (filter === "active") list = list.filter(u => !u.is_banned);
  if (filter === "banned") list = list.filter(u => u.is_banned);

  const totalPages = Math.max(1, Math.ceil(list.length / usersPerPage));
  if (usersPage > totalPages) usersPage = totalPages;
  const start = (usersPage - 1) * usersPerPage;
  const pageList = list.slice(start, start + usersPerPage);

  if (!pageList.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading">Kullanıcı bulunamadı.</td></tr>`;
    $("#usersPagination").innerHTML = "";
    return;
  }

  tbody.innerHTML = pageList.map(u => {
    const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
    const avContent = u.avatar_url ? "" : initials(u.name);
    const d = new Date(u.created_at);
    const status = u.is_banned ? '<span class="badge-pill badge-banned">⛔ Banlı</span>' : '<span class="badge-pill badge-active">✓ Aktif</span>';
    const checked = selectedUsers.has(u.id) ? "checked" : "";
    return `<tr>
      <td><input type="checkbox" class="user-check row-check" data-id="${u.id}" ${checked}></td>
      <td>
        <div class="user-cell" style="cursor:pointer" onclick="showUserDetail('${u.id}')">
          <div class="av" style="${avStyle}">${avContent}</div>
          <div><b>${esc(u.name)}</b><span>${esc(u.country || "")} · ${esc(u.job || "—")}</span></div>
        </div>
      </td>
      <td>${u.age} · ${u.gender === "kadın" ? "Kadın" : u.gender === "erkek" ? "Erkek" : "—"}</td>
      <td>${esc(u.city || "—")}</td>
      <td>${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}</td>
      <td>${status}</td>
      <td>
        <div class="action-btns">
          <button class="btn-ghost btn-sm" onclick="showUserDetail('${u.id}')">🔍 Detay</button>
          ${u.is_banned
            ? `<button class="btn-ghost btn-sm" onclick="adminUnban('${u.id}')">✅ Ban Kaldır</button>`
            : `<button class="btn-ghost btn-sm" style="color:#f39c12" onclick="adminBan('${u.id}')">⛔ Banla</button>`}
          <button class="btn-danger btn-sm" onclick="adminDeleteUser('${u.id}', '${esc(u.name)}')">🗑️ Sil</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  // Pagination
  let pag = "";
  pag += `<button class="page-btn" onclick="changeUsersPage(${usersPage-1})" ${usersPage===1?"disabled":""}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - usersPage) <= 2) {
      pag += `<button class="page-btn ${i===usersPage?"active":""}" onclick="changeUsersPage(${i})">${i}</button>`;
    } else if (Math.abs(i - usersPage) === 3) {
      pag += `<span style="padding:0 4px;color:#888">…</span>`;
    }
  }
  pag += `<button class="page-btn" onclick="changeUsersPage(${usersPage+1})" ${usersPage===totalPages?"disabled":""}>›</button>`;
  $("#usersPagination").innerHTML = pag;

  // Row checkbox listeners
  $$(".row-check").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) selectedUsers.add(cb.dataset.id);
      else selectedUsers.delete(cb.dataset.id);
      updateBulkBar();
    });
  });
  updateBulkBar();
}

function changeUsersPage(page) {
  const search = ($("#userSearch")?.value || "").toLowerCase().trim();
  const filter = $("#userFilter")?.value || "all";
  let list = usersList.slice();
  if (search) list = list.filter(u => (u.name||"").toLowerCase().includes(search) || (u.city||"").toLowerCase().includes(search));
  if (filter === "active") list = list.filter(u => !u.is_banned);
  if (filter === "banned") list = list.filter(u => u.is_banned);
  const totalPages = Math.max(1, Math.ceil(list.length / usersPerPage));
  if (page < 1 || page > totalPages) return;
  usersPage = page;
  renderUsers();
}

function updateBulkBar() {
  const bar = $("#bulkBar");
  if (!bar) return;
  if (selectedUsers.size > 0) { bar.classList.add("show"); $("#bulkCount").textContent = selectedUsers.size; }
  else bar.classList.remove("show");
}

function clearSelection() {
  selectedUsers.clear();
  renderUsers();
}

async function bulkBan() {
  if (!selectedUsers.size) return;
  showConfirm("Toplu Banla", `${selectedUsers.size} kullanıcıyı banlamak istediğine emin misin?`, async () => {
    const ids = Array.from(selectedUsers);
    const { error } = await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).in("id", ids);
    if (error) { toast("Hata: " + error.message); return; }
    toast(`✓ ${ids.length} kullanıcı banlandı`);
    selectedUsers.clear(); loadUsers();
  });
}
async function bulkUnban() {
  if (!selectedUsers.size) return;
  showConfirm("Toplu Ban Kaldır", `${selectedUsers.size} kullanıcının banını kaldırmak istediğine emin misin?`, async () => {
    const ids = Array.from(selectedUsers);
    const { error } = await db.from("profiles").update({ is_banned: false, banned_at: null }).in("id", ids);
    if (error) { toast("Hata: " + error.message); return; }
    toast(`✓ ${ids.length} kullanıcının banı kaldırıldı`);
    selectedUsers.clear(); loadUsers();
  });
}
async function bulkDelete() {
  if (!selectedUsers.size) return;
  showConfirm("Toplu Sil", `${selectedUsers.size} kullanıcıyı KALICI olarak silmek istediğine emin misin? Bu işlem GERİ ALINAMAZ.`, async () => {
    const ids = Array.from(selectedUsers);
    const { error } = await db.from("profiles").delete().in("id", ids);
    if (error) { toast("Hata: " + error.message); return; }
    toast(`✓ ${ids.length} kullanıcı silindi`);
    selectedUsers.clear(); loadUsers();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const s = $("#userSearch"); if (s) s.addEventListener("input", () => { usersPage = 1; renderUsers(); });
  const f = $("#userFilter"); if (f) f.addEventListener("change", () => { usersPage = 1; renderUsers(); });
  const selAll = $("#selectAllUsers");
  if (selAll) selAll.addEventListener("change", () => {
    if (selAll.checked) usersList.forEach(u => selectedUsers.add(u.id));
    else selectedUsers.clear();
    renderUsers();
  });
});

// ============================================================
// KULLANICI AKSİYONLARI
// ============================================================
async function adminBan(userId) {
  const u = usersCache[userId];
  showConfirm("Kullanıcıyı Banla", `${u?.name || "Bu kullanıcı"} adlı kullanıcıyı banlamak istediğine emin misin?`, async () => {
    const { error } = await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).eq("id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    if (usersCache[userId]) usersCache[userId].is_banned = true;
    toast("✓ Kullanıcı banlandı"); loadUsers(); loadDashboard();
  });
}
async function adminUnban(userId) {
  const u = usersCache[userId];
  showConfirm("Banı Kaldır", `${u?.name || "Bu kullanıcı"} adlı kullanıcının banını kaldırmak istediğine emin misin?`, async () => {
    const { error } = await db.from("profiles").update({ is_banned: false, banned_at: null }).eq("id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    if (usersCache[userId]) usersCache[userId].is_banned = false;
    toast("✓ Ban kaldırıldı"); loadUsers(); loadDashboard();
  });
}
async function adminDeleteUser(userId, name) {
  showConfirm("Kullanıcıyı Sil", `${name} adlı kullanıcıyı tamamen silmek istediğine emin misin? Bu işlem GERİ ALINAMAZ.`, async () => {
    const { error } = await db.from("profiles").delete().eq("id", userId);
    if (error) { toast("Hata: " + error.message); return; }
    delete usersCache[userId];
    toast("✓ Kullanıcı silindi"); loadUsers(); loadDashboard();
  });
}

// ============================================================
// KULLANICI DETAY
// ============================================================
async function showUserDetail(userId) {
  const modal = $("#userDetailModal");
  const body = $("#userDetailBody");
  modal.classList.add("open");
  body.innerHTML = `<div class="table-loading">Yükleniyor...</div>`;

  const { data: u, error } = await db.from("profiles").select("*").eq("id", userId).single();
  if (error || !u) { body.innerHTML = `<div class="table-loading">Bulunamadı</div>`; return; }

  const [repRes, msgRes, likeRes, blockRes] = await Promise.all([
    db.from("reports").select("*").or(`reporter_id.eq.${userId},reported_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
    db.from("messages").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
    db.from("likes").select("*", { count: "exact", head: true }).eq("liked_id", userId),
    db.from("blocks").select("*", { count: "exact", head: true }).eq("blocker_id", userId)
  ]);

  const reports = repRes.data || [];
  const messages = msgRes.data || [];
  const likeCount = likeRes.count || 0;
  const blockCount = blockRes.count || 0;

  const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
  const avContent = u.avatar_url ? "" : initials(u.name);
  const photos = Array.isArray(u.photos) ? u.photos : (u.avatar_url ? [u.avatar_url] : []);

  const lastSeen = u.last_seen ? new Date(u.last_seen + (u.last_seen.endsWith("Z") ? "" : "Z")).toLocaleString("tr-TR") : "—";

  body.innerHTML = `
    <div class="detail-header">
      <div class="av" style="${avStyle}">${avContent}</div>
      <div>
        <h2>${esc(u.name)}, ${u.age}</h2>
        <div class="meta">${esc(u.job || "—")} · ${esc(u.city || "—")}${u.country && u.country !== "Türkiye" ? ", " + esc(u.country) : ""}</div>
        <div class="meta">Son görülme: ${lastSeen}</div>
      </div>
    </div>

    ${u.is_banned ? `<div style="background:#ffe6e6;color:#c72c2c;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-weight:700;font-size:.85rem">⛔ Bu kullanıcı banlı</div>` : ""}

    ${photos.length ? `<div class="detail-section-title">📸 Fotoğraflar (${photos.length})</div><div class="detail-photos">${photos.map(p => `<img src="${esc(p)}" onclick="window.open('${esc(p)}','_blank')" loading="lazy">`).join("")}</div>` : ""}

    <div class="detail-section-title">👤 Temel Bilgiler</div>
    <div class="detail-grid">
      <div class="detail-item"><span>Cinsiyet</span><b>${u.gender === "kadın" ? "Kadın" : u.gender === "erkek" ? "Erkek" : "—"}</b></div>
      <div class="detail-item"><span>Medeni Durum</span><b>${esc(u.marital_status || "—")}</b></div>
      <div class="detail-item"><span>Eğitim</span><b>${esc(u.education || "—")}</b></div>
      <div class="detail-item"><span>Meslek</span><b>${esc(u.job || "—")}</b></div>
      <div class="detail-item"><span>Boy</span><b>${u.height ? u.height + " cm" : "—"}</b></div>
      <div class="detail-item"><span>Kilo</span><b>${u.weight ? u.weight + " kg" : "—"}</b></div>
      <div class="detail-item"><span>E-posta Onayı</span><b>${u.email_confirmed ? "Onaylı" : "—"}</b></div>
      <div class="detail-item"><span>Kayıt Tarihi</span><b>${new Date(u.created_at).toLocaleDateString("tr-TR")}</b></div>
    </div>

    ${u.bio ? `<div class="detail-section-title">📝 Hakkında</div><div class="detail-list-item">${esc(u.bio)}</div>` : ""}

    ${Array.isArray(u.interests) && u.interests.length ? `<div class="detail-section-title">🎯 İlgi Alanları</div><div class="detail-list-item">${u.interests.map(i => esc(i)).join(", ")}</div>` : ""}

    <div class="detail-section-title">📊 İstatistikler</div>
    <div class="detail-stats">
      <div class="detail-stat"><b>${likeCount}</b><span>Beğeni</span></div>
      <div class="detail-stat"><b>${messages.length}</b><span>Mesaj</span></div>
      <div class="detail-stat"><b>${reports.length}</b><span>Şikayet</span></div>
      <div class="detail-stat"><b>${blockCount}</b><span>Engelleme</span></div>
    </div>

    ${reports.length ? `<div class="detail-section-title">⚠️ Son Şikayetler</div>${reports.map(r => {
      const d = new Date(r.created_at).toLocaleString("tr-TR");
      const isReporter = r.reporter_id === userId;
      return `<div class="detail-list-item"><div class="head"><b>${isReporter ? "🔺 Şikayet eden" : "🔻 Şikayet edilen"}</b><span class="date">${d}</span></div><div class="body">Sebep: <b>${esc(r.reason)}</b>${r.description ? ` — "${esc(r.description)}"` : ""}</div></div>`;
    }).join("")}` : ""}

    ${messages.length ? `<div class="detail-section-title">💬 Son Mesajlar</div>${messages.map(m => {
      const d = new Date(m.created_at).toLocaleString("tr-TR");
      const dir = m.sender_id === userId ? "→" : "←";
      return `<div class="detail-list-item"><div class="head"><b>${dir} ${m.image_url ? "📷 Resim" : ""}</b><span class="date">${d}</span></div><div class="body">${esc((m.content || "").slice(0, 120))}</div></div>`;
    }).join("")}` : ""}

    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
      ${u.is_banned
        ? `<button class="btn-ghost btn-sm" onclick="closeUserDetail(); adminUnban('${u.id}')">✅ Ban Kaldır</button>`
        : `<button class="btn-ghost btn-sm" style="color:#f39c12" onclick="closeUserDetail(); adminBan('${u.id}')">⛔ Banla</button>`}
      <button class="btn-danger btn-sm" onclick="closeUserDetail(); adminDeleteUser('${u.id}', '${esc(u.name)}')">🗑️ Kullanıcıyı Sil</button>
    </div>
  `;
}

function closeUserDetail() {
  $("#userDetailModal").classList.remove("open");
}
document.addEventListener("click", e => {
  const modal = $("#userDetailModal");
  if (modal && e.target === modal) closeUserDetail();
});

// ============================================================
// ŞİKAYETLER
// ============================================================
async function loadReportsBadge() {
  const { count } = await db.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
  const b = $("#reportsBadge");
  if (b) { if (count > 0) { b.textContent = count; b.style.display = "inline-block"; } else b.style.display = "none"; }
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

  const reasonLabels = { inappropriate: "Uygunsuz içerik", spam: "Spam / Reklam", fake: "Sahte hesap", harassment: "Taciz / Hakaret", scam: "Dolandırıcılık", other: "Diğer" };

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
          <div class="report-user" style="cursor:pointer" onclick="showUserDetail('${r.reporter_id}')">
            <div class="av" style="${repAvStyle}">${repAvContent}</div>
            <div><b>${esc(reporter.name)}</b><span>Şikayet eden</span></div>
          </div>
          <div class="report-arrow">→</div>
          <div class="report-user" style="cursor:pointer" onclick="showUserDetail('${r.reported_id}')">
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
async function approveReport(id) { const { error } = await db.from("reports").update({ status: "approved" }).eq("id", id); if (error) { toast("Hata: " + error.message); return; } toast("✓ Onaylandı"); loadReports(); loadReportsBadge(); }
async function rejectReport(id) { const { error } = await db.from("reports").update({ status: "rejected" }).eq("id", id); if (error) { toast("Hata: " + error.message); return; } toast("✓ Reddedildi"); loadReports(); loadReportsBadge(); }
async function banAndApprove(reportId, userId, name) {
  showConfirm("Banla & Onayla", `${name} adlı kullanıcıyı banlamak ve şikayeti onaylamak istediğine emin misin?`, async () => {
    await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).eq("id", userId);
    await db.from("reports").update({ status: "approved" }).eq("id", reportId);
    toast("✓ Kullanıcı banlandı ve şikayet onaylandı");
    loadReports(); loadReportsBadge(); loadDashboard();
  });
}
document.addEventListener("DOMContentLoaded", () => { const f = $("#reportFilter"); if (f) f.addEventListener("change", loadReports); });

// ============================================================
// MESAJLAR
// ============================================================
async function loadMessages() {
  const tbody = $("#messagesTable");
  tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  messagesList = data || [];
  messagesPage = 1;
  renderMessages();
}
function renderMessages() {
  const tbody = $("#messagesTable");
  let list = messagesList.slice();
  const term = messageSearchTerm.toLowerCase().trim();
  if (term) list = list.filter(m => (m.content||"").toLowerCase().includes(term) || (m.sender_name||"").toLowerCase().includes(term) || (m.receiver_name||"").toLowerCase().includes(term));

  const totalPages = Math.max(1, Math.ceil(list.length / messagesPerPage));
  if (messagesPage > totalPages) messagesPage = totalPages;
  const start = (messagesPage - 1) * messagesPerPage;
  const pageList = list.slice(start, start + messagesPerPage);

  if (!pageList.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Mesaj bulunamadı.</td></tr>`;
    $("#messagesPagination").innerHTML = "";
    return;
  }
  tbody.innerHTML = pageList.map(m => {
    const d = new Date(m.created_at);
    const dateStr = `${d.getDate()}.${d.getMonth()+1} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    const content = m.content ? esc(m.content).slice(0, 80) : (m.image_url ? "📷 Resim" : "—");
    return `<tr>
      <td><b>${esc(m.sender_name || m.sender_id.slice(0,8))}</b></td>
      <td>${esc(m.receiver_name || m.receiver_id.slice(0,8))}</td>
      <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${content}</td>
      <td style="color:#888;font-size:.82rem">${dateStr}</td>
    </tr>`;
  }).join("");

  let pag = "";
  pag += `<button class="page-btn" onclick="changeMsgPage(${messagesPage-1})" ${messagesPage===1?"disabled":""}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - messagesPage) <= 2) pag += `<button class="page-btn ${i===messagesPage?"active":""}" onclick="changeMsgPage(${i})">${i}</button>`;
    else if (Math.abs(i - messagesPage) === 3) pag += `<span style="padding:0 4px;color:#888">…</span>`;
  }
  pag += `<button class="page-btn" onclick="changeMsgPage(${messagesPage+1})" ${messagesPage===totalPages?"disabled":""}>›</button>`;
  $("#messagesPagination").innerHTML = pag;
}
function changeMsgPage(p) { const totalPages = Math.max(1, Math.ceil(messagesList.length / messagesPerPage)); if (p < 1 || p > totalPages) return; messagesPage = p; renderMessages(); }

document.addEventListener("DOMContentLoaded", () => {
  const s = $("#msgSearch");
  if (s) s.addEventListener("input", () => {
    messageSearchTerm = s.value;
    // Mesajları yeniden yükle (isimleri de çekmek için)
    if (messageSearchTerm.length >= 2 && messagesList.length === 0) loadMessages();
    else renderMessages();
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
      <td style="text-align:right"><button class="btn-ghost btn-sm" onclick="removeBlock(${b.id})">🔓 Engeli Kaldır</button></td>
    </tr>`;
  }).join("");
}

async function removeBlock(blockId) {
  showConfirm("Engeli Kaldır", `Bu engeli kaldırmak istediğine emin misin?`, async () => {
    const { error } = await db.from("blocks").delete().eq("id", blockId);
    if (error) { toast("Hata: " + error.message); return; }
    toast("✓ Engel kaldırıldı");
    loadBlocks();
    loadDashboard();
  });
}

// ============================================================
// SİTE AYARLARI
// ============================================================
async function loadSettings() {
  try {
    const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) { toast("Ayarlar yüklenemedi: " + error.message); return; }
    if (!data) return;
    $("#set-siteName").value = data.site_name || "Evlenmek İsteyenler";
    $("#set-contactEmail").value = data.contact_email || "";
    $("#set-maintenance").value = data.maintenance_mode ? "on" : "off";
  } catch(e) { console.error("Ayarlar hatası:", e); }
}
async function saveSettings() {
  const siteName = $("#set-siteName").value.trim();
  const contactEmail = $("#set-contactEmail").value.trim();
  const maintenance = $("#set-maintenance").value === "on";
  if (!siteName) { toast("Site adı boş olamaz"); return; }
  const btn = document.querySelector('#page-settings .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = "Kaydediliyor..."; }
  const { error } = await db.from("site_settings").update({ site_name: siteName, contact_email: contactEmail, maintenance_mode: maintenance, updated_at: new Date().toISOString() }).eq("id", 1);
  if (btn) { btn.disabled = false; btn.textContent = "💾 Kaydet"; }
  if (error) { toast("Hata: " + error.message); return; }
  toast("✅ Ayarlar kaydedildi");
}
async function clearAllReports() {
  if (!confirm("TÜM şikayetleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
  const { error } = await db.from("reports").delete().neq("id", 0);
  if (error) { toast("Hata: " + error.message); return; }
  toast("✓ Tüm şikayetler silindi");
  loadReports(); loadReportsBadge(); loadDashboard();
}

// ============================================================
// BAŞLAT
// ============================================================
(async function init() {
  db.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") { showLogin(); }
    else if (event === "SIGNED_IN") { checkAdminAuth(); }
  });
  await checkAdminAuth();
})();