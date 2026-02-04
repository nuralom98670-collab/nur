// /assets/js/pages/shop.js
import "../core/site-ui.js";
import { api } from "../core/api.js";
import { getToken } from "../core/auth.js";

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const qInput = document.getElementById("q");
const catSelect = document.getElementById("cat");
const subtitle = document.getElementById("subtitle");
const yearEl = document.getElementById("year");
const cartCountEl = document.getElementById("cartCount");

yearEl.textContent = String(new Date().getFullYear());

let CURRENCY = "৳";

async function loadSiteConfig(){
  try{
    const r = await fetch("/api/public/site-config");
    if(!r.ok) throw new Error("cfg");
    const c = await r.json();
    CURRENCY = c.currency || CURRENCY;
  }catch{}
}

let wishlistSet = new Set();
async function loadWishlist(){
  const token = getToken();
  if(!token) { wishlistSet = new Set(); return; }
  try {
    const items = await api.get("/account/wishlist");
    wishlistSet = new Set((items||[]).map(x=>x?.id).filter(Boolean));
  } catch {
    wishlistSet = new Set();
  }
}


function getCart() { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
function setCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  cartCountEl.textContent = String(cart.reduce((s, x) => s + Number(x.qty || 1), 0));
}
setCart(getCart());

function escapeHtml(str) {
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function norm(v){ return String(v||"").trim().toLowerCase(); }

function card(p) {
  const disabled = Number(p.stock || 0) <= 0;
  const price = Number(p.price || 0);
  const discount = Number(p.discountPrice || 0);
  const hasDiscount = discount > 0 && discount < price;
  const showPrice = hasDiscount ? discount : price;
  const wished = wishlistSet.has(p.id);
  return `
    <div class="card" style="padding:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div class="muted">${escapeHtml(p.categoryLabel || p.category || "Product")}</div>
        <button class="wish-btn ${wished ? 'active' : ''}" type="button" title="Wishlist" data-wish="${escapeHtml(p.id)}" aria-label="Wishlist">${wished ? "♥" : "♡"}</button>
      </div>
      ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" style="margin-top:10px; width:100%; height:180px; object-fit:cover; border-radius:14px; border:1px solid rgba(255,255,255,.08);" />` : ``}
      <a class="linkcard" href="./product.html?id=${encodeURIComponent(p.id)}" style="display:block; margin-top:8px;">
        <h3 style="margin:0 0 6px;">${escapeHtml(p.name)}</h3>
      </a>
      <div class="muted">Stock: ${escapeHtml(String(p.stock))}</div>
      <div style="height:10px;"></div>
      <div style="display:flex; gap:10px; align-items:baseline; flex-wrap:wrap;">
        <div style="font-weight:900; font-size:18px;">${CURRENCY}${Number(showPrice).toFixed(2)}</div>
        ${hasDiscount ? `<div class="muted" style="text-decoration:line-through;">${CURRENCY}${Number(price).toFixed(2)}</div>` : ``}
      </div>

      <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
        <button class="btn primary" data-buy="${escapeHtml(p.id)}" ${disabled ? "disabled" : ""} style="flex:1; min-width:160px;">${disabled ? "Out of stock" : "Buy now"}</button>
        <button class="btn" data-add="${escapeHtml(p.id)}" ${disabled ? "disabled" : ""} style="flex:1; min-width:160px;">Add to cart</button>
      </div>
    </div>
  `;
}

let all = [];

function applyFromUrl() {
  const sp = new URLSearchParams(location.search);
  const cat = sp.get("cat");
  if (cat) { catSelect.value = cat; subtitle.textContent = `Category: ${cat}`; }

  const q = sp.get("q");
  if (q) qInput.value = q;
}

function applyFilter() {
  const q = norm(qInput.value);
  const cat = norm(catSelect.value);
  let list = [...all];
  if (cat) list = list.filter(p => {
    if (norm(p.categoryKey || p.category) === cat) return true;
    const cats = Array.isArray(p.categories) ? p.categories : [];
    return cats.some(c => norm(c?.key) === cat);
  });
  if (q) list = list.filter(p => norm(p.name).includes(q) || norm(p.categoryLabel || p.category).includes(q));
  countEl.textContent = String(list.length);

  if (!list.length) { grid.innerHTML = `<div class="muted">No products found.</div>`; return; }
  grid.innerHTML = list.map(card).join("");

  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add");
      const p = all.find(x => String(x.id) === String(id));
      if (!p) return;
      const cart = getCart();
      const idx = cart.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) cart[idx].qty = Number(cart[idx].qty || 1) + 1;
      else {
        const price = Number(p.price || 0);
        const discount = Number(p.discountPrice || 0);
        const finalPrice = (discount > 0 && discount < price) ? discount : price;
        cart.push({ id: p.id, name: p.name, price: finalPrice, qty: 1 });
      }
      setCart(cart);
      btn.textContent = "Added ✅";
      setTimeout(() => (btn.textContent = "Add to cart"), 800);
    });
  });


    // Buy now buttons (go straight to checkout)
  document.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-buy");
      const p = all.find(x => String(x.id) === String(id));
      if (!p) return;
      const price = Number(p.price || 0);
      const discount = Number(p.discountPrice || 0);
      const finalPrice = (discount > 0 && discount < price) ? discount : price;
      const cart = [{ id: p.id, name: p.name, price: finalPrice, qty: 1 }];
      setCart(cart);
      location.href = "./checkout.html";
    });
  });


// Wishlist buttons
  document.querySelectorAll("[data-wish]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-wish");
      const token = getToken();
      if (!token) {
        location.href = `./login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
        return;
      }
      try {
        if (wishlistSet.has(id)) {
          await api.post("/account/wishlist/remove", { productId: id });
          wishlistSet.delete(id);
        } else {
          await api.post("/account/wishlist/add", { productId: id });
          wishlistSet.add(id);
        }
        btn.textContent = wishlistSet.has(id) ? "♥" : "♡";
        btn.classList.toggle("active", wishlistSet.has(id));
      } catch {
        // ignore
      }
    });
  });

}


async function loadCategories(){
  try{
    const res = await fetch("/api/public/categories?kind=shop");
    const cats = await res.json();
    const items = Array.isArray(cats) ? cats : (cats.items||[]);
    // reset options
    catSelect.innerHTML = `<option value="">All Categories</option>` + items.map(c => 
      `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`
    ).join("");
  }catch{
    // keep existing
  }
}

async function loadProducts() {
  statusEl.textContent = "Loading…";
  try {
    const res = await fetch("/api/public/products");
    const data = await res.json();
    all = Array.isArray(data) ? data : (data.items || []);
    statusEl.textContent = "";
  } catch (e) {
    all = [];
    statusEl.textContent = "Failed to load products.";
  }
  applyFromUrl();
  applyFilter();
}

qInput.addEventListener("input", applyFilter);
catSelect.addEventListener("change", () => {
  const cat = catSelect.value || "";
  const sp = new URLSearchParams(location.search);
  if (cat) sp.set("cat", cat); else sp.delete("cat");
  history.replaceState({}, "", `${location.pathname}?${sp.toString()}`);
  applyFilter();
});

await loadWishlist();
await loadSiteConfig();
await loadCategories();
await loadProducts();
