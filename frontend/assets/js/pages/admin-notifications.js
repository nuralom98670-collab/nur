import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox } from "../core/ui.js";

const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const qEl = document.getElementById("q");
const markAll = document.getElementById("markAll");

function escapeHtml(str){
  return String(str??""
  ).replaceAll("&","&amp;")
   .replaceAll("<","&lt;")
   .replaceAll(">","&gt;")
   .replaceAll('"',"&quot;")
   .replaceAll("'","&#039;");
}

function fmtTime(iso){
  try { return new Date(iso).toLocaleString(); } catch { return String(iso||""); }
}

function linkFor(n){
  const rt = String(n.refType||"");
  const id = String(n.refId||"");
  if(rt === "order" && id) return `order-view?id=${encodeURIComponent(id)}`;
  if(rt === "message" && id) return `message-view?id=${encodeURIComponent(id)}`;
  return null;
}

function render(items){
  const term = String(qEl?.value||"").trim().toLowerCase();
  const filtered = !term ? items : items.filter(n =>
    String(n.title||"").toLowerCase().includes(term) ||
    String(n.body||"").toLowerCase().includes(term) ||
    String(n.type||"").toLowerCase().includes(term) ||
    String(n.refId||"").toLowerCase().includes(term)
  );

  if(!filtered.length){
    listEl.innerHTML = `<div class="card" style="padding:14px;">No notifications.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(n => {
    const unread = Number(n.isRead||0) ? "" : "border:1px solid rgba(56,189,248,.35);";
    const l = linkFor(n);
    return `
      <div class="card" data-id="${escapeHtml(n.id)}" style="padding:14px; margin:10px 0; ${unread}">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:800;">${escapeHtml(n.title||'Notification')}</div>
            ${n.body ? `<div class="muted" style="margin-top:6px; line-height:1.6;">${escapeHtml(n.body)}</div>` : ""}
            <div class="muted" style="font-size:12px; margin-top:8px;">${escapeHtml(String(n.type||'system'))} • ${escapeHtml(fmtTime(n.createdAt))}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${l ? `<a class="btn" href="${l}">Open</a>` : ""}
            <button class="btn" data-read="${escapeHtml(n.id)}">Mark read</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

let all = [];

async function load(){
  statusEl.textContent = "Loading…";
  try{
    all = await api.get("/admin/notifications?limit=80");
    render(Array.isArray(all) ? all : []);
    statusEl.textContent = "";
  }catch(e){
    statusEl.textContent = e?.message || "Could not load notifications";
  }
}

qEl?.addEventListener("input", ()=>render(all));

listEl?.addEventListener("click", async (e)=>{
  const btn = e.target?.closest?.("[data-read]");
  if(!btn) return;
  const id = btn.getAttribute("data-read");
  try{
    await api.put(`/admin/notifications/read?id=${encodeURIComponent(id)}`, {});
  }catch{}
  await load();
});

markAll?.addEventListener("click", async ()=>{
  try{
    await api.put("/admin/notifications/read", {});
  }catch{}
  await load();
});

await requireAdmin();
bindLogout();
await renderUserbox();
await load();