// /assets/js/pages/product.js
import "../core/site-ui.js";
import { api } from "../core/api.js";
import { getToken } from "../core/auth.js";

const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const cartCountEl = document.getElementById("cartCount");

const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const categoryEl = document.getElementById("category");
const nameEl = document.getElementById("name");
const priceEl = document.getElementById("price");
const stockBadgeEl = document.getElementById("stockBadge");
const descEl = document.getElementById("desc");
const imgEl = document.getElementById("productImg");
const thumbsEl = document.getElementById("thumbs");

const qtyEl = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const wishBtn = document.getElementById("wishBtn");
const statusEl = document.getElementById("status");

let inWishlist = false;
async function syncWishlist(productId){
  const token = getToken();
  if(!token){
    inWishlist = false;
    if (wishBtn) wishBtn.textContent = "♡ Wishlist";
    return;
  }
  try {
    const items = await api.get("/account/wishlist");
    inWishlist = (items || []).some(x => String(x?.id) === String(productId));
    if (wishBtn) wishBtn.textContent = inWishlist ? "♥ Wishlisted" : "♡ Wishlist";
  } catch {
    inWishlist = false;
    if (wishBtn) wishBtn.textContent = "♡ Wishlist";
  }
}

const relatedGrid = document.getElementById("relatedGrid");

// Reviews
const reviewsListEl = document.getElementById("reviewsList");
const reviewsSummaryEl = document.getElementById("reviewsSummary");
const reviewForm = document.getElementById("reviewForm");
const reviewStatusEl = document.getElementById("reviewStatus");
const reviewHintEl = document.getElementById("reviewHint");

function getCart(){ try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
function setCart(cart){
  localStorage.setItem("cart", JSON.stringify(cart));
  cartCountEl.textContent = String(cart.reduce((s,x)=>s+Number(x.qty||1),0));
}
setCart(getCart());

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function formatMoney(n){ return `৳${Number(n||0).toFixed(2)}`; }

function setStatus(msg){ statusEl.textContent = msg || ""; }

function stars(n){
  const r = Math.max(1, Math.min(5, Number(n||0)));
  return "★".repeat(r) + "☆".repeat(5-r);
}

async function loadReviews(productId){
  if(!reviewsListEl) return;
  reviewsListEl.textContent = "Loading…";
  try{
    const r = await fetch(`/api/public/reviews/${encodeURIComponent(productId)}`);
    const items = await r.json();
    const list = Array.isArray(items) ? items : (items?.items || []);
    if(!list.length){
      reviewsListEl.innerHTML = `<div class="muted">No reviews yet.</div>`;
      if (reviewsSummaryEl) reviewsSummaryEl.textContent = "0 reviews";
      return;
    }
    const avg = list.reduce((s,x)=>s+Number(x.rating||0),0) / list.length;
    if (reviewsSummaryEl) reviewsSummaryEl.textContent = `${list.length} review(s) • ${avg.toFixed(1)}/5`;
    reviewsListEl.innerHTML = list.map(rv => {
      const who = rv.name || "Customer";
      const when = rv.createdAt ? new Date(rv.createdAt).toLocaleDateString() : "";
      const body = rv.body ? escapeHtml(rv.body) : "";
      return `
        <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,.06);">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:800;">${escapeHtml(who)}</div>
            <div class="muted">${escapeHtml(when)}</div>
          </div>
          <div style="margin-top:6px; font-weight:800;">${stars(rv.rating)}</div>
          ${body ? `<div class="muted" style="margin-top:6px; line-height:1.6;">${body}</div>` : ``}
        </div>
      `;
    }).join("");
  }catch{
    reviewsListEl.innerHTML = `<div class="muted">Failed to load reviews.</div>`;
    if (reviewsSummaryEl) reviewsSummaryEl.textContent = "—";
  }
}

async function bindReviewForm(productId){
  if (!reviewForm) return;
  const token = getToken();
  if (!token) {
    if (reviewHintEl) reviewHintEl.innerHTML = `Please <a href="./login.html?next=${encodeURIComponent(location.pathname + location.search)}">login</a> to write a review.`;
  }

  reviewForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if (!getToken()) {
      location.href = `./login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    if (reviewStatusEl) reviewStatusEl.textContent = "Submitting…";
    try {
      const data = Object.fromEntries(new FormData(reviewForm).entries());
      const payload = {
        productId,
        rating: Number(data.rating || 5),
        body: String(data.body || "").trim()
      };
      await api.post("/account/reviews", payload);
      if (reviewStatusEl) reviewStatusEl.textContent = "Submitted ✅ (pending admin approval)";
      reviewForm.reset();
      // refresh list (still pending, so it won't show until approved)
      loadReviews(productId);
    } catch (err) {
      const msg = err?.message || String(err);
      if (reviewStatusEl) reviewStatusEl.textContent = msg;
    }
  });
}

function renderGallery(p){
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const primary = p.imageUrl || images[0] || null;

  if (imgEl) {
    if (primary){
      imgEl.src = primary;
      imgEl.alt = p.name || "";
      imgEl.style.display = "block";
    } else {
      imgEl.style.display = "none";
      imgEl.src = "";
      imgEl.alt = "";
    }
  }

  if (!thumbsEl) return;
  const allImgs = [];
  if (primary) allImgs.push(primary);
  for (const u of images){
    if (u && !allImgs.includes(u)) allImgs.push(u);
  }

  thumbsEl.innerHTML = allImgs.map((u, idx) => `
    <button class="btn" type="button" data-img="${escapeHtml(u)}" style="padding:0; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,.08);">
      <img src="${escapeHtml(u)}" alt="" style="width:100%; height:72px; object-fit:cover; display:block;" />
    </button>
  `).join("");

  thumbsEl.querySelectorAll("[data-img]").forEach(btn => {
    btn.addEventListener("click", () => {
      const u = btn.getAttribute("data-img");
      if (imgEl && u){
        imgEl.src = u;
        imgEl.style.display = "block";
      }
    });
  });
}

function productCard(p){
  const price = Number(p.price || 0);
  const discount = Number(p.discountPrice || 0);
  const hasDiscount = discount > 0 && discount < price;
  const showPrice = hasDiscount ? discount : price;
  return `
    <a class="card linkcard" href="./product.html?id=${encodeURIComponent(p.id)}" style="padding:16px;">
      <div class="muted">${escapeHtml(p.categoryLabel || "Product")}</div>
      <h3 style="margin:8px 0 6px;">${escapeHtml(p.name)}</h3>
      <div class="muted">Stock: ${escapeHtml(String(p.stock))}</div>
      <div style="height:10px;"></div>
      <div style="display:flex; gap:10px; align-items:baseline; flex-wrap:wrap;">
        <div style="font-weight:800; font-size:18px;">${escapeHtml(formatMoney(showPrice))}</div>
        ${hasDiscount ? `<div class="muted" style="text-decoration:line-through;">${escapeHtml(formatMoney(price))}</div>` : ``}
      </div>
    </a>
  `;
}

async function loadProduct(){
  const sp = new URLSearchParams(location.search);
  const id = sp.get("id");
  if (!id){
    titleEl.textContent = "Product";
    subtitleEl.textContent = "Missing product id";
    setStatus("Missing product id in URL. Example: /product.html?id=p1");
    addBtn.disabled = true;
    return;
  }

  let p;
  try {
    const r = await fetch(`/api/public/products/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("Not found");
    p = await r.json();
  } catch {
    p = null;
  }

  if (!p){
    titleEl.textContent = "Not found";
    subtitleEl.textContent = `Product id: ${id}`;
    setStatus("Product not found.");
    addBtn.disabled = true;
    return;
  }

  await syncWishlist(p.id);

  document.title = `${p.name} • RoboticsLeb`;

  titleEl.textContent = p.name;
  subtitleEl.textContent = p.categoryLabel ? `Category: ${p.categoryLabel}` : "—";
  categoryEl.textContent = p.categoryLabel || "—";
  nameEl.textContent = p.name;
  const price = Number(p.price || 0);
  const discount = Number(p.discountPrice || 0);
  const hasDiscount = discount > 0 && discount < price;
  const showPrice = hasDiscount ? discount : price;

  if (priceEl) {
    priceEl.innerHTML = `${formatMoney(showPrice)}${hasDiscount ? ` <span class="muted" style="text-decoration:line-through; font-weight:600; font-size:14px;">${formatMoney(price)}</span>` : ""}`;
  }

  renderGallery(p);

  // Reviews
  loadReviews(p.id);
  bindReviewForm(p.id);

  const inStock = Number(p.stock || 0) > 0;
  stockBadgeEl.textContent = inStock ? `In stock: ${p.stock}` : "Out of stock";
  addBtn.disabled = !inStock;

  descEl.textContent = p.desc || "—";

  // Reviews
  loadReviews(p.id);
  bindReviewForm(p.id);

  // Related products (same category)
  let all = [];
  try {
    const rr = await fetch("/api/public/products");
    const data = await rr.json();
    all = Array.isArray(data) ? data : (data.items || []);
  } catch {
    all = [];
  }
  const related = all.filter(x => x.categoryKey === p.categoryKey && x.id !== p.id).slice(0,3);
  relatedGrid.innerHTML = related.length ? related.map(productCard).join("") : `<div class="muted">No related products yet.</div>`;

  addBtn.onclick = () => {
    const qty = Math.max(1, Math.floor(Number(qtyEl.value || 1)));
    const cart = getCart();
    const idx = cart.findIndex(x => String(x.id) === String(p.id));
    if (idx >= 0) cart[idx].qty = Number(cart[idx].qty || 1) + qty;
    else cart.push({ id: p.id, name: p.name, price: showPrice, qty });
    setCart(cart);
    setStatus(`Added ${qty} item(s) ✅`);
  };

  if (wishBtn) {
    wishBtn.onclick = async () => {
      const token = getToken();
      if (!token) {
        location.href = `./login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
        return;
      }
      try {
        if (inWishlist) {
          await api.post("/account/wishlist/remove", { productId: p.id });
          inWishlist = false;
          wishBtn.textContent = "♡ Wishlist";
        } else {
          await api.post("/account/wishlist/add", { productId: p.id });
          inWishlist = true;
          wishBtn.textContent = "♥ Wishlisted";
        }
      } catch {
        // ignore
      }
    };
  }
}

loadProduct();
