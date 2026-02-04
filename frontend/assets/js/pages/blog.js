import "../core/site-ui.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const cartCountEl = document.getElementById("cartCount");
const catFilter = document.getElementById("catFilter");
const qInput = document.getElementById("q");
const subtitle = document.getElementById("subtitle");

function getCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}
cartCountEl.textContent = String(getCart().reduce((s, x) => s + Number(x.qty || 1), 0));

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function norm(v){ return String(v||"").trim().toLowerCase(); }

function decodeEntities(str){
  let s = String(str || "");
  for (let i = 0; i < 3; i++) {
    if (!/&(lt|gt|amp|quot|#039);/i.test(s)) break;
    const t = document.createElement("textarea");
    t.innerHTML = s;
    const next = t.value;
    if (next === s) break;
    s = next;
  }
  return s;
}

function stripTags(html){
  const raw = decodeEntities(html);
  return String(raw)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function card(p) {
  const title = p.title || "Untitled";
  const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "";
  const plain = stripTags(p.body || "");
  const excerpt = plain.length > 120 ? plain.slice(0, 120) + "…" : plain;
  return `
    <a class="card linkcard" href="./blog-post?id=${encodeURIComponent(p.id)}" style="padding:16px;">
      <div class="muted">${escapeHtml(date)}</div>
      ${p.coverImageUrl ? `<img src="${p.coverImageUrl}" alt="${escapeHtml(title)}" style="margin-top:10px; width:100%; height:200px; object-fit:cover; border-radius:14px; border:1px solid rgba(255,255,255,.08);" />` : ``}
      <h3 style="margin:8px 0 6px;">${escapeHtml(title)}</h3>
      <p class="muted" style="margin:0; line-height:1.6;">${escapeHtml(excerpt)}</p>
    </a>
  `;
}

let allPosts = [];

function applyFilter(){
  const ck = norm(catFilter?.value || "");
  const q = norm(qInput?.value || "");
  let list = [...allPosts];
  if (ck) list = list.filter(p => norm(p.categoryKey) === ck);
  if (q) list = list.filter(p => norm(p.title).includes(q) || norm(p.body).includes(q));

  grid.innerHTML = list.length ? list.map(card).join("") : "";
  statusEl.textContent = list.length ? "" : "No posts found.";
  if (subtitle){
    if (ck && q) subtitle.textContent = `Category + Search`;
    else if (ck) subtitle.textContent = `Category: ${ck}`;
    else if (q) subtitle.textContent = `Search results`;
    else subtitle.textContent = "Latest posts";
  }
}

async function loadPosts(){
  statusEl.textContent = "Loading…";
  try{
    const res = await fetch("/api/public/posts");
    const data = await res.json();
    allPosts = data.items || [];
    statusEl.textContent = "";
  }catch{
    allPosts = [];
    statusEl.textContent = "Failed to load posts.";
  }
  applyFilter();
}

async function loadCategories(){
  if(!catFilter) return;
  try{
    const r = await fetch("/api/public/categories?kind=blog");
    const list = await r.json();
    const items = Array.isArray(list) ? list : (list.items||[]);
    catFilter.innerHTML = `<option value="">All categories</option>` + items.map(c=>`<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join("");
  }catch{}
}

await loadCategories();
await loadPosts();

catFilter?.addEventListener("change", applyFilter);
qInput?.addEventListener("input", applyFilter);
