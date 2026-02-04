import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const q = document.getElementById("q");
const openCreate = document.getElementById("openCreate");
const createCard = document.getElementById("createCard");
const cancelCreate = document.getElementById("cancelCreate");
const createForm = document.getElementById("createForm");
const createStatus = document.getElementById("createStatus");

const coverFile = document.getElementById("coverFile");
const coverPreview = document.getElementById("coverPreview");
const galleryFiles = document.getElementById("galleryFiles");
const galleryPreview = document.getElementById("galleryPreview");
const needsFiles = document.getElementById("needsFiles");

const tbl = document.getElementById("tbl");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function money(n){ return `৳${Number(n||0).toFixed(2)}`; }
function dt(v){ try { return new Date(v).toLocaleString(); } catch { return ""; } }

let all = [];

function render(){
  const query = String(q.value||"").trim().toLowerCase();
  const items = query ? all.filter(x => (x.title||"").toLowerCase().includes(query)) : all;
  countBadge.textContent = String(items.length);
  tbl.querySelector("tbody").innerHTML = items.length ? items.map(row).join("") :
    `<tr><td class="muted" colspan="5">No items</td></tr>`;
}

function row(s){
  return `
    <tr>
      <td class="muted">${escapeHtml(String(s.id||"").slice(-6))}</td>
      <td>${escapeHtml(s.title||"")}</td>
      <td>${escapeHtml(money(s.price))}</td>
      <td class="muted">${escapeHtml(dt(s.updatedAt))}</td>
      <td>
        <button class="btn" data-del="${escapeHtml(s.id)}" type="button">Delete</button>
      </td>
    </tr>
  `;
}

async function load(){
  statusEl.textContent = "Loading…";
  try{
    all = await api.get("/admin/service-items");
    statusEl.textContent = "";
  }catch(err){
    all = [];
    statusEl.textContent = err?.message || String(err);
  }
  render();
  bindActions();
}

function bindActions(){
  tbl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Delete this service?")) return;
      try{
        await api.del(`/admin/service-items/${encodeURIComponent(id)}`);
        await load();
      }catch(err){
        alert(err?.message || String(err));
      }
    });
  });
}

openCreate?.addEventListener("click", () => { createCard.style.display="block"; });
cancelCreate?.addEventListener("click", () => {
  createCard.style.display="none";
  createForm.reset();
  createStatus.textContent="";
  if (coverPreview) coverPreview.style.display = "none";
  if (galleryPreview) galleryPreview.innerHTML = "";
});
q?.addEventListener("input", render);

coverFile?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  coverPreview.src = URL.createObjectURL(f);
  coverPreview.style.display = "block";
});

function renderGalleryPreview(files){
  if (!galleryPreview) return;
  galleryPreview.innerHTML = "";
  Array.from(files||[]).forEach(f=>{
    const url = URL.createObjectURL(f);
    const d = document.createElement("div");
    d.className = "card";
    d.style.padding = "8px";
    d.innerHTML = `<img src="${url}" alt="" style="width:100%; height:100px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />`;
    galleryPreview.appendChild(d);
  });
}
galleryFiles?.addEventListener("change", (e)=>renderGalleryPreview(e.target.files));

createForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  createStatus.textContent = "Saving…";
  const data = Object.fromEntries(new FormData(createForm).entries());
  data.price = Number(data.price||0);
  data.needsFiles = needsFiles?.checked ? 1 : 0;
  try{
    // upload cover
    if (coverFile?.files?.[0]){
      createStatus.textContent = "Uploading cover…";
      const up = await api.upload("/admin/upload-image", coverFile.files[0], "file");
      data.imageUrl = up.url;
    }

    // upload gallery
    const files = Array.from(galleryFiles?.files || []);
    if (files.length){
      const urls = [];
      for (let i=0;i<files.length;i++){
        createStatus.textContent = `Uploading image ${i+1}/${files.length}…`;
        const up = await api.upload("/admin/upload-image", files[i], "file");
        urls.push(up.url);
      }
      data.galleryJson = JSON.stringify(urls);
    }

    await api.post("/admin/service-items", data);
    createStatus.textContent = "Saved ✅";
    createCard.style.display="none";
    createForm.reset();
    if (coverPreview) coverPreview.style.display = "none";
    if (galleryPreview) galleryPreview.innerHTML = "";
    await load();
  }catch(err){
    createStatus.textContent = err?.message || String(err);
  }
});

load();
