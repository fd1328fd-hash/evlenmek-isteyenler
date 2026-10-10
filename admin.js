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
}

async function adminLogout() {
  await db.auth.signOut();
  location.reload();
}

// Login formu
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
      btn.disabled = true;
      btn.textContent = "Giriş yapılıyor...";
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      btn.textContent = "Giriş Yap";
      if (error) { note.textContent = "Hata: " + error.message; return; }

      const { data: adminData } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!adminData) {
        note.textContent = "Bu hesap admin yetkisine sahip değil.";
        await db.auth.signOut();
        return;
      }
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
      return `<div class="recent-item">
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
  tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) { tbody.innerHTML = `<tr><td colspan="6" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  const users = data || [];
  users.forEach(u => usersCache[u.id] = u);
  renderUsers(users);
}

function renderUsers(users) {
  const tbody = $("#usersTable");
  const search = $("#userSearch").value.toLowerCase().trim();
  const filter = $("#userFilter").value;

  let list = users;
  if (search) {
    list = list.filter(u => (u.name || "").toLowerCase().includes(search) || (u.city || "").toLowerCase().includes(search) || (u.job || "").toLowerCase().includes(search));
  }
  if (filter === "active") list = list.filter(u => !u.is_banned);
  if (filter === "banned") list = list.filter(u => u.is_banned);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Kullanıcı bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const avStyle = u.avatar_url ? `background:url('${esc(u.avatar_url)}') center/cover` : `background:${grad(u.id)}`;
    const avContent = u.avatar_url ? "" : initials(u.name);
    const d = new Date(u.created_at);
    const status = u.is_banned ? '<span class="badge-pill badge-banned">⛔ Banlı</span>' : '<span class="badge-pill badge-active">✓ Aktif</span>';
    return `<tr>
      <td>
        <div class="user-cell">
          <div class="av" style="${avStyle}">${avContent}</div>
          <div>
            <b>${esc(u.name)}</b>
            <span>${esc(u.country || "")} · ${esc(u.job || "—")}</span>
          </div>
        </div>
      </td>
      <td>${u.age} · ${u.gender === "kadın" ? "Kadın" : u.gender === "erkek" ? "Erkek" : "—"}</td>
      <td>${esc(u.city || "—")}</td>
      <td>${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}</td>
      <td>${status}</td>
      <td>
        <div class="action-btns">
          ${u.is_banned
            ? `<button class="btn-ghost btn-sm" onclick="adminUnban('${u.id}')">✅ Ban Kaldır</button>`
            : `<button class="btn-ghost btn-sm" style="color:#f39c12" onclick="adminBan('${u.id}')">⛔ Banla</button>`
          }
          <button class="btn-danger btn-sm" onclick="adminDeleteUser('${u.id}', '${esc(u.name)}')">🗑️ Sil</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const s = $("#userSearch"); if (s) s.addEventListener("input", () => renderUsers(Object.values(usersCache)));
  const f = $("#userFilter"); if (f) f.addEventListener("change", () => renderUsers(Object.values(usersCache)));
});

// ============================================================
// KULLANICI AKSİYONLARI
// ============================================================
async function adminBan(userId) {
  const u = usersCache[userId];
  showConfirm("Kullanıcıyı Banla", `${u?.name || "Bu kullanıcı"} adlı kullanıcıyı banlamak istediğine emin misin? Giriş yapamayacak.`, async () => {
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
    toast("✓ Kullanıcı silindi");
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
  if (!reports.length) {
    list.innerHTML = `<div class="table-loading">Şikayet yok.</div>`;
    return;
  }

  const ids = new Set();
  reports.forEach(r => { ids.add(r.reporter_id); ids.add(r.reported_id); });
  const { data: users } = await db.from("profiles").select("id,name,avatar_url,city,is_banned").in("id", Array.from(ids));
  const uMap = {};
  (users || []).forEach(u => uMap[u.id] = u);

  const reasonLabels = {
    inappropriate: "Uygunsuz içerik / fotoğraf",
    spam: "Spam / Reklam",
    fake: "Sahte hesap",
    harassment: "Taciz / Hakaret",
    scam: "Dolandırıcılık",
    other: "Diğer"
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
          <div class="report-user">
            <div class="av" style="${repAvStyle}">${repAvContent}</div>
            <div><b>${esc(reporter.name)}</b><span>Şikayet eden</span></div>
          </div>
          <div class="report-arrow">→</div>
          <div class="report-user">
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
          <button class="btn-primary btn-sm" onclick="approveReport(${r.id})">✓ Şikayeti Onayla</button>
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
  loadReports();
  loadReportsBadge();
}

async function rejectReport(id) {
  const { error } = await db.from("reports").update({ status: "rejected" }).eq("id", id);
  if (error) { toast("Hata: " + error.message); return; }
  toast("✓ Şikayet reddedildi");
  loadReports();
  loadReportsBadge();
}

async function banAndApprove(reportId, userId, name) {
  showConfirm("Banla & Onayla", `${name} adlı kullanıcıyı banlamak ve şikayeti onaylamak istediğine emin misin?`, async () => {
    await db.from("profiles").update({ is_banned: true, banned_at: new Date().toISOString() }).eq("id", userId);
    await db.from("reports").update({ status: "approved" }).eq("id", reportId);
    toast("✓ Kullanıcı banlandı ve şikayet onaylandı");
    loadReports();
    loadReportsBadge();
    loadDashboard();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const f = $("#reportFilter");
  if (f) f.addEventListener("change", loadReports);
});

// ============================================================
// MESAJLAR
// ============================================================
async function loadMessages() {
  const tbody = $("#messagesTable");
  tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("messages").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  const msgs = data || [];
  if (!msgs.length) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Henüz mesaj yok.</td></tr>`; return; }

  const ids = new Set();
  msgs.forEach(m => { ids.add(m.sender_id); ids.add(m.receiver_id); });
  const { data: users } = await db.from("profiles").select("id,name").in("id", Array.from(ids));
  const uMap = {};
  (users || []).forEach(u => uMap[u.id] = u);

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

// ============================================================
// ENGELLEMELER
// ============================================================
async function loadBlocks() {
  const tbody = $("#blocksTable");
  tbody.innerHTML = `<tr><td colspan="3" class="table-loading">Yükleniyor...</td></tr>`;
  const { data, error } = await db.from("blocks").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) { tbody.innerHTML = `<tr><td colspan="3" class="table-loading" style="color:#e74c3c">Hata: ${esc(error.message)}</td></tr>`; return; }
  const blocks = data || [];
  if (!blocks.length) { tbody.innerHTML = `<tr><td colspan="3" class="table-loading">Henüz engelleme yok.</td></tr>`; return; }

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
    </tr>`;
  }).join("");
}

// ============================================================
// SİTE AYARLARI
// ============================================================
async function loadSettings() {
  try {
    const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) { toast("Ayarlar yüklenemedi: " + error.message); return; }
    if (!data) return;
    const nameEl = $("#set-siteName"); if (nameEl) nameEl.value = data.site_name || "Evlenmek İsteyenler";
    const emailEl = $("#set-contactEmail"); if (emailEl) emailEl.value = data.contact_email || "";
    const maintEl = $("#set-maintenance"); if (maintEl) maintEl.value = data.maintenance_mode ? "on" : "off";
  } catch(e) {
    console.error("Ayarlar hatası:", e);
  }
}

async function saveSettings() {
  const siteName = $("#set-siteName").value.trim();
  const contactEmail = $("#set-contactEmail").value.trim();
  const maintenance = $("#set-maintenance").value === "on";

  if (!siteName) { toast("Site adı boş olamaz"); return; }

  const btn = document.querySelector('#page-settings .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = "Kaydediliyor..."; }

  const { error } = await db.from("site_settings").update({
    site_name: siteName,
    contact_email: contactEmail,
    maintenance_mode: maintenance,
    updated_at: new Date().toISOString()
  }).eq("id", 1);

  if (btn) { btn.disabled = false; btn.textContent = "💾 Kaydet"; }

  if (error) { toast("Hata: " + error.message); return; }
  toast("✅ Ayarlar kaydedildi");
}

async function clearAllReports() {
  if (!confirm("TÜM şikayetleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
  const { error } = await db.from("reports").delete().neq("id", 0);
  if (error) { toast("Hata: " + error.message); return; }
  toast("✓ Tüm şikayetler silindi");
  loadReports();
  loadReportsBadge();
  loadDashboard();
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