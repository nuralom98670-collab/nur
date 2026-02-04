import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const form = document.getElementById("productForm");
const statusEl = document.getElementById("status");

const categorySelect = document.getElementById("categorySelect");
const categoryLabelEl = document.getElementById("categoryLabel");

const galleryInput = document.getElementById("galleryFiles");
const galleryPreview = document.getElementById("galleryPreview");
const existingGallery = document.getElementById("existingGallery");
const addMoreBtn = document.getElementById("addMoreImages");
const clearBtn = document.getElementById("clearImages");

// Keep new uploads in an array so admin can add images one-by-one.
let selectedFiles = [];

const sp = new URLSearchParams(location.search);
const id = sp.get("id");

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function loadShopCategories(selectedKey){
  try{
    const cats = await api.get("/admin/categories?kind=shop");
    const items = Array.isArray(cats) ? cats : (cats.items||[]);
    categorySelect.innerHTML = `<option value="">— Select —</option>` + items.map(c =>
      `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`
    ).join("");
    if (selectedKey) categorySelect.value = selectedKey;
    const opt = categorySelect.options[categorySelect.selectedIndex];
    categoryLabelEl.value = opt?.textContent || "";
  }catch{
    // ignore
  }
}
categorySelect?.addEventListener("change", () => {
  const opt = categorySelect.options[categorySelect.selectedIndex];
  categoryLabelEl.value = opt?.textContent || "";
});

function renderGalleryPreview(files){
  galleryPreview.innerHTML = "";
  const list = Array.from(files || []);
  list.forEach((f, idx) => {
    const url = URL.createObjectURL(f);
    const card = document.createElement("div");
    card.className = "card";
    card.style.padding = "8px";
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
        <div class="muted" style="font-size:12px; font-weight:800;">New ${idx+1}</div>
        <button class="btn" type="button" data-rm="${idx}" style="padding:6px 10px;">Remove</button>
      </div>
      <img src="${url}" alt="" style="width:100%; height:110px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />
    `;
    galleryPreview.appendChild(card);
  });

  galleryPreview.querySelectorAll("[data-rm]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-rm"));
      if (Number.isFinite(i)) {
        selectedFiles = selectedFiles.filter((_, k) => k !== i);
        renderGalleryPreview(selectedFiles);
      }
    });
  });
}
function addFilesFromInput(){
  const file = galleryInput?.files?.[0];
  if (!file) return;
  selectedFiles.push(file);
  renderGalleryPreview(selectedFiles);
  galleryInput.value = "";
}

galleryInput?.addEventListener("change", addFilesFromInput);
addMoreBtn?.addEventListener("click", () => galleryInput?.click());
clearBtn?.addEventListener("click", () => {
  selectedFiles = [];
  renderGalleryPreview(selectedFiles);
  if (galleryInput) galleryInput.value = "";
});

function parseImagesJson(v){
  try { return JSON.parse(v || "[]"); } catch { return []; }
}

let current = null;

function renderExisting(images){
  if (!existingGallery) return;
  existingGallery.innerHTML = "";
  const list = images.filter(Boolean);
  list.forEach((u) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.style.padding = "0";
    btn.style.borderRadius = "12px";
    btn.style.overflow = "hidden";
    btn.innerHTML = `<img src="${escapeHtml(u)}" alt="" style="width:100%; height:100px; object-fit:cover; display:block;" />`;
    btn.addEventListener("click", () => {
      if (!current) return;
      current.imageUrl = u;
      // move to front
      const imgs = [u, ...parseImagesJson(current.imagesJson).filter(x => x !== u)];
      current.imagesJson = JSON.stringify(imgs);
      renderExisting(imgs);
      statusEl.textContent = "Main image updated (will save when you click Save)";
    });
    existingGallery.appendChild(btn);
  });
}

async function loadProduct(){
  if (!id){
    statusEl.textContent = "Missing ?id";
    form.querySelector("button[type=submit]")?.setAttribute("disabled","disabled");
    return;
  }
  try{
    current = await api.get(`/admin/products/${encodeURIComponent(id)}`);
    // fill fields
    form.name.value = current.name || "";
    form.price.value = current.price ?? 0;
    if (form.discountPrice) form.discountPrice.value = current.discountPrice ?? 0;
    form.stock.value = current.stock ?? 0;
    form.desc.value = current.desc || "";
    await loadShopCategories(current.categoryKey || "");
    renderExisting([current.imageUrl, ...parseImagesJson(current.imagesJson)].filter(Boolean));
  }catch(err){
    statusEl.textContent = err?.message || String(err);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Saving…";
  const data = Object.fromEntries(new FormData(form).entries());
  data.price = Number(data.price || 0);
  data.discountPrice = Number(data.discountPrice || 0);
  data.stock = Number(data.stock || 0);

  try{
    // start with current images
    let urls = [];
    if (current){
      urls = [current.imageUrl, ...parseImagesJson(current.imagesJson)].filter(Boolean);
    }

    // new uploads appended
    const files = Array.from(selectedFiles || []);
    if (files.length){
      for (let i=0; i<files.length; i++){
        statusEl.textContent = `Uploading image ${i+1}/${files.length}…`;
        const up = await api.upload("/admin/upload-image", files[i], "file");
        urls.push(up.url);
      }
    }

    // keep unique
    urls = Array.from(new Set(urls.filter(Boolean)));

    if (current?.imageUrl && urls.includes(current.imageUrl)){
      // ensure main image first
      urls = [current.imageUrl, ...urls.filter(u => u !== current.imageUrl)];
    }
    data.imageUrl = urls[0] || null;
    data.imagesJson = urls.length ? JSON.stringify(urls) : null;

    if (!data.categoryLabel && categoryLabelEl) data.categoryLabel = categoryLabelEl.value || "";

    await api.put(`/admin/products/${encodeURIComponent(id)}`, data);
    statusEl.textContent = "Saved ✅";
    location.href = "./products";
  }catch(err){
    statusEl.textContent = err?.message || String(err);
  }
});

loadProduct();
