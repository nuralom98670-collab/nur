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
function money(n){ return `৳${Number(n||0).toFixed(2)}`; }

function card(s){
  return `
    <a class="card linkcard" href="./service-detail.html?id=${encodeURIComponent(s.id)}" style="padding:16px;">
      ${s.imageUrl ? `<img src="${escapeHtml(s.imageUrl)}" alt="" style="width:100%; height:160px; object-fit:cover; border-radius:16px; border:1px solid rgba(255,255,255,.08); margin-bottom:12px;" />` : ""}
      <h3 style="margin:0 0 6px;">${escapeHtml(s.title || "Service")}</h3>
      <div class="muted" style="line-height:1.6;">${escapeHtml(s.body || "")}</div>
      <div style="height:12px;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="font-weight:800; font-size:18px;">${escapeHtml(money(s.price))}</div>
        ${Number(s.needsFiles||0) ? `<span class="badge">File required</span>` : ""}
      </div>
    </a>
  `;
}

async function load(){
  statusEl.textContent = "Loading…";
  try{
    const r = await fetch("/api/public/service-items");
    const data = await r.json();
    const items = Array.isArray(data) ? data : (data.items||[]);
    grid.innerHTML = items.length ? items.map(card).join("") : "";
    statusEl.textContent = items.length ? "" : "No services added yet.";
  }catch{
    grid.innerHTML = "";
    statusEl.textContent = "Failed to load services.";
  }
}

load();
