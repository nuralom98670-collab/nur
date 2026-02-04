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

const categoryBox = document.getElementById("categoryBox");
const categoriesJsonEl = document.getElementById("categoriesJson");

const galleryInput = document.getElementById("galleryFiles");
const galleryPreview = document.getElementById("galleryPreview");
const addMoreBtn = document.getElementById("addMoreImages");
const clearBtn = document.getElementById("clearImages");

// We keep a local array of selected files so the admin can add images one-by-one.
// (Mobile browsers often make multi-select awkward; this avoids "only last image" issues.)
let selectedFiles = [];

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function loadShopCategories(){
  try{
    const cats = await api.get("/admin/categories?kind=shop");
    const items = Array.isArray(cats) ? cats : (cats.items||[]);
    categoryBox.innerHTML = items.length ? items.map(c => {
      const id = `cat_${escapeHtml(c.key)}`;
      return `
        <label style="display:flex; gap:10px; align-items:center; padding:8px; border-radius:12px; border:1px solid rgba(255,255,255,.08);">
          <input type="checkbox" data-cat-key="${escapeHtml(c.key)}" data-cat-label="${escapeHtml(c.label)}" />
          <span>${escapeHtml(c.label)}</span>
        </label>
      `;
    }).join("") : `<div class="muted">No shop categories yet. Create from Categories page.</div>`;
    bindCategoryBox();
  }catch{
    // ignore
  }
}

function bindCategoryBox(){
  if (!categoryBox) return;
  categoryBox.querySelectorAll("input[type=checkbox][data-cat-key]").forEach(cb => {
    cb.addEventListener("change", syncCategoriesJson);
  });
  syncCategoriesJson();
}

function syncCategoriesJson(){
  if (!categoriesJsonEl || !categoryBox) return;
  const selected = Array.from(categoryBox.querySelectorAll("input[type=checkbox][data-cat-key]:checked")).map(cb => ({
    key: cb.getAttribute("data-cat-key"),
    label: cb.getAttribute("data-cat-label")
  }));
  categoriesJsonEl.value = JSON.stringify(selected);
}

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
        <div class="muted" style="font-size:12px; font-weight:800;">${idx === 0 ? 'Main' : `Image ${idx+1}`}</div>
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
  const files = Array.from(galleryInput?.files || []);
  if (!files.length) return;
  // append all newly selected files
  for (const f of files){
    if (f) selectedFiles.push(f);
  }
  renderGalleryPreview(selectedFiles);
  // reset input so picking the same file again still triggers change
  galleryInput.value = "";
}

galleryInput?.addEventListener("change", addFilesFromInput);
addMoreBtn?.addEventListener("click", () => galleryInput?.click());
clearBtn?.addEventListener("click", () => {
  selectedFiles = [];
  renderGalleryPreview(selectedFiles);
  if (galleryInput) galleryInput.value = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Saving…";

  const data = Object.fromEntries(new FormData(form).entries());
  data.price = Number(data.price || 0);
  data.discountPrice = Number(data.discountPrice || 0);
  data.stock = Number(data.stock || 0);

  try {
    // derive primary category (for backward compatibility)
    try{
      const cats = JSON.parse(data.categoriesJson || "[]");
      if (Array.isArray(cats) && cats.length){
        data.categoryKey = cats[0].key;
        data.categoryLabel = cats[0].label;
      }
    }catch{}

    // If images are provided, send a SINGLE multipart request (more reliable).
    const files = Array.from(selectedFiles || []);
    if (files.length) {
      statusEl.textContent = `Uploading ${files.length} image(s) & saving…`;
      const fd = new FormData();
      Object.entries(data).forEach(([k,v]) => fd.append(k, v ?? ""));
      files.forEach(f => fd.append("images", f));
      await api.postForm("/admin/products-multipart", fd);
      statusEl.textContent = "Saved ✅";
      location.href = "./products";
      return;
    }

    // Ensure at least 1 category optional; set primary categoryKey/categoryLabel from first selection
    try{
      const arr = JSON.parse(data.categoriesJson || "[]");
      if (Array.isArray(arr) && arr.length){
        data.categoryKey = arr[0].key;
        data.categoryLabel = arr[0].label;
      }
    }catch{}

    await api.post("/admin/products", data);
    statusEl.textContent = "Saved ✅";
    location.href = "./products";
  } catch (err) {
    statusEl.textContent = err?.message || String(err);
  }
});

loadShopCategories();
