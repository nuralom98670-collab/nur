// /assets/js/pages/home.js
import "../core/site-ui.js";
const featuredGrid = document.getElementById("featuredGrid");
const homeStatus = document.getElementById("homeStatus");
const yearEl = document.getElementById("year");
const cartCount = document.getElementById("cartCount");
const kpiProducts = document.getElementById("kpiProducts");
const kpiInStock = document.getElementById("kpiInStock");
const kpiSold = document.getElementById("kpiSold");
const starterVideoWrap = document.getElementById("starterVideoWrap");
const starterVideo = document.getElementById("starterVideo");
const starterVideoTitle = document.getElementById("starterVideoTitle");
const testimonialsWrap = document.querySelector('.testimonials');

let CURRENCY = "৳";

yearEl.textContent = String(new Date().getFullYear());

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    return cart.reduce((sum, x) => sum + Number(x.qty || 1), 0);
  } catch { return 0; }
}
cartCount.textContent = String(getCartCount());

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function card(p) {
  const price = Number(p.price || 0);
  const discount = Number(p.discountPrice || 0);
  const hasDiscount = discount > 0 && discount < price;
  const showPrice = hasDiscount ? discount : price;
  return `
    <a class="card linkcard" href="./product.html?id=${encodeURIComponent(p.id)}">
      <div class="muted">${escapeHtml(p.categoryLabel || p.category || "Product")}</div>
      <h3 style="margin:8px 0 6px;">${escapeHtml(p.name)}</h3>
      <div class="muted">Stock: ${escapeHtml(String(p.stock))}</div>
      <div style="height:10px;"></div>
      <div style="display:flex; gap:10px; align-items:baseline; flex-wrap:wrap;">
        <div style="font-weight:800; font-size:18px;">${CURRENCY}${Number(showPrice).toFixed(2)}</div>
        ${hasDiscount ? `<div class="muted" style="text-decoration:line-through;">${CURRENCY}${Number(price).toFixed(2)}</div>` : ``}
      </div>
    </a>
  `;
}

function toYouTubeEmbed(url) {
  const u = String(url||"").trim();
  if (!u) return "";
  // Accept either embed url or normal youtu.be / watch?v=
  if (u.includes("/embed/")) return u;
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return u;
}

async function loadSiteConfig(){
  try {
    const r = await fetch("/api/public/site-config");
    if (!r.ok) throw new Error("no config");
    const cfg = await r.json();
    CURRENCY = cfg.currency || CURRENCY;

    // Home hero customization
    try{
      const heroTitle = String(cfg.homeHeroTitle || '').trim();
      const heroSubtitle = String(cfg.homeHeroSubtitle || '').trim();
      const h1 = document.querySelector('.hero-text h1');
      const p = document.querySelector('.hero-text p');
      if (h1 && heroTitle) h1.textContent = heroTitle;
      if (p && heroSubtitle) p.textContent = heroSubtitle;

      // Buttons
      const btns = Array.from(document.querySelectorAll('.hero-actions a.btn'));
      const [primary, secondary] = btns;
      if (primary){
        const t = String(cfg.homeHeroPrimaryText || '').trim();
        const l = String(cfg.homeHeroPrimaryLink || '').trim();
        if (t) primary.textContent = t;
        if (l) primary.setAttribute('href', l);
      }
      if (secondary){
        const t = String(cfg.homeHeroSecondaryText || '').trim();
        const l = String(cfg.homeHeroSecondaryLink || '').trim();
        if (t) secondary.textContent = t;
        if (l) secondary.setAttribute('href', l);
      }

      // Optional highlight cards for "Why" section
      const hj = String(cfg.homeHighlightsJson || '').trim();
      if (hj){
        const arr = JSON.parse(hj);
        if (Array.isArray(arr) && arr.length){
          const section = Array.from(document.querySelectorAll('section.section')).find(s =>
            s.querySelector('.section-head h2')?.textContent?.toLowerCase()?.includes('why')
          );
          const grid = section?.querySelector('.grid.three');
          if (grid){
            grid.innerHTML = arr.slice(0, 6).map(x => {
              const t = escapeHtml(x?.title || '');
              const b = escapeHtml(x?.body || '');
              return `<div class="card" style="padding:16px;"><h3 style="margin-top:0;">${t}</h3><p class="muted">${b}</p></div>`;
            }).join('');
          }
        }
      }
    }catch{}
    const embed = toYouTubeEmbed(cfg.starterVideoUrl);
    if (embed && starterVideoWrap && starterVideo) {
      starterVideo.src = embed;
      starterVideoWrap.style.display = "block";
      if (starterVideoTitle) {
        const t = String(cfg.starterVideoTitle || "").trim();
        if (t) { starterVideoTitle.textContent = t; starterVideoTitle.style.display = "block"; }
        else { starterVideoTitle.textContent = ""; starterVideoTitle.style.display = "none"; }
      }
    }
  } catch {}
}

async function loadKpis(){
  try {
    const r = await fetch('/api/public/stats');
    if (!r.ok) throw new Error('stats');
    const s = await r.json();
    if (kpiProducts) kpiProducts.textContent = String(s.productCount ?? '—');
    if (kpiInStock) kpiInStock.textContent = String(s.inStock ?? '—');
    if (kpiSold) kpiSold.textContent = String(s.soldPieces ?? '—');
  } catch {
    // fallback is computed later
  }
}

async function loadFeatured() {
  homeStatus.textContent = "Loading…";

  let featured = [];
  let all = [];
  try {
    const fr = await fetch("/api/public/featured");
    featured = await fr.json();
  } catch {
    featured = [];
  }

  try {
    const pr = await fetch("/api/public/products");
    const pdata = await pr.json();
    all = Array.isArray(pdata) ? pdata : (pdata.items || []);
  } catch {
    all = [];
  }

  featuredGrid.innerHTML = (featured.length ? featured : all.slice(0, 3)).map(card).join("");
  homeStatus.textContent = featured.length || all.length ? "" : "No products yet.";

  // fallback KPIs if /stats failed
  if (kpiProducts && (kpiProducts.textContent === '—' || !kpiProducts.textContent)) kpiProducts.textContent = String(all.length);
  if (kpiInStock && (kpiInStock.textContent === '—' || !kpiInStock.textContent)) kpiInStock.textContent = String(all.reduce((s, x) => s + Number(x.stock || 0), 0));
}

function stars(rating){
  const n = Math.max(1, Math.min(5, Number(rating||0)));
  return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n);
}

function quoteCard(r){
  const who = r?.name || 'Customer';
  const body = String(r?.body || '').trim();
  const product = r?.productName ? ` • ${escapeHtml(r.productName)}` : '';
  return `
    <div class="quote">
      <div style="font-weight:700;">${escapeHtml(stars(r?.rating))}${product}</div>
      <div class="muted" style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(body || '—')}</div>
      <div class="who"><span class="avatar"></span><div><div style="font-weight:700;">${escapeHtml(who)}</div><div class="muted">Verified buyer</div></div></div>
    </div>
  `;
}

async function loadHomeReviews(){
  if (!testimonialsWrap) return;
  try{
    const r = await fetch('/api/public/home-reviews?limit=6');
    if(!r.ok) throw new Error('reviews');
    const data = await r.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    const cleaned = items.filter(x => String(x?.body||'').trim());
    if (!cleaned.length) return; // keep default static quotes
    testimonialsWrap.innerHTML = cleaned.slice(0,3).map(quoteCard).join('');
  }catch{
    // keep default static quotes
  }
}

await loadSiteConfig();
await loadKpis();
await loadHomeReviews();
loadFeatured();
