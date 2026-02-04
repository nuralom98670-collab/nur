import "../core/site-ui.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const cartCountEl = document.getElementById("cartCount");

function getCart() { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
cartCountEl.textContent = String(getCart().reduce((s, x) => s + Number(x.qty || 1), 0));

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function card(a){
  const imgs = Array.isArray(a.images) ? a.images.filter(Boolean) : [];
  const cover = a.apkUrl ? "" : "";
  return `
    <div class="card" style="padding:16px;">
      <h3 style="margin:0 0 6px;">${escapeHtml(a.name || "App")}</h3>
      <div class="muted" style="line-height:1.6;">${escapeHtml(a.body || "")}</div>
      ${imgs.length ? `<div style="height:10px;"></div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap:10px;">
          ${imgs.slice(0,6).map(u=>`<img src="${escapeHtml(u)}" alt="" style="width:100%; height:80px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />`).join("")}
        </div>` : ``}
      <div style="height:12px;"></div>
      ${a.apkUrl ? `<a class="btn primary" href="${escapeHtml(a.apkUrl)}" download>Download</a>` : `<span class="muted">No download file yet.</span>`}
    </div>
  `;
}

async function load(){
  statusEl.textContent = "Loading…";
  try{
    const r = await fetch("/api/public/apps");
    const data = await r.json();
    const items = Array.isArray(data) ? data : (data.items||[]);
    grid.innerHTML = items.length ? items.map(card).join("") : "";
    statusEl.textContent = items.length ? "" : "No apps added yet.";
  }catch{
    grid.innerHTML = "";
    statusEl.textContent = "Failed to load apps.";
  }
}

load();
