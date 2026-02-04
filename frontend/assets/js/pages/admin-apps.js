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

const apkFile = document.getElementById("apkFile");
const galleryFiles = document.getElementById("galleryFiles");
const galleryPreview = document.getElementById("galleryPreview");

const tbl = document.getElementById("tbl");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function dt(v){ try { return new Date(v).toLocaleString(); } catch { return ""; } }

let all = [];

function render(){
  const query = String(q.value||"").trim().toLowerCase();
  const items = query ? all.filter(x => (x.name||"").toLowerCase().includes(query)) : all;
  countBadge.textContent = String(items.length);
  tbl.querySelector("tbody").innerHTML = items.length ? items.map(row).join("") :
    `<tr><td class="muted" colspan="5">No items</td></tr>`;
}

function row(a){
  return `
    <tr>
      <td class="muted">${escapeHtml(String(a.id||"").slice(-6))}</td>
      <td>${escapeHtml(a.name||"")}</td>
      <td class="muted">${a.apkUrl ? `<a href="${escapeHtml(a.apkUrl)}" target="_blank">Download link</a>` : "—"}</td>
      <td class="muted">${escapeHtml(dt(a.updatedAt))}</td>
      <td>
        <button class="btn" data-del="${escapeHtml(a.id)}" type="button">Delete</button>
      </td>
    </tr>
  `;
}

async function load(){
  statusEl.textContent = "Loading…";
  try{
    all = await api.get("/admin/apps");
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
      if (!confirm("Delete this app?")) return;
      try{
        await api.del(`/admin/apps/${encodeURIComponent(id)}`);
        await load();
      }catch(err){
        alert(err?.message || String(err));
      }
    });
  });
}

openCreate?.addEventListener("click", () => { createCard.style.display="block"; });
cancelCreate?.addEventListener("click", () => { createCard.style.display="none"; createForm.reset(); createStatus.textContent=""; galleryPreview.innerHTML=""; });
q?.addEventListener("input", render);

function renderGalleryPreview(files){
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

  try{
    // upload apk/file
    if (apkFile?.files?.[0]){
      createStatus.textContent = "Uploading file…";
      const up = await api.upload("/admin/upload-file", apkFile.files[0], "file");
      data.apkUrl = up.url;
    }

    // upload images
    const files = Array.from(galleryFiles?.files || []);
    if (files.length){
      const urls = [];
      for (let i=0;i<files.length;i++){
        createStatus.textContent = `Uploading image ${i+1}/${files.length}…`;
        const up = await api.upload("/admin/upload-image", files[i], "file");
        urls.push(up.url);
      }
      data.imagesJson = JSON.stringify(urls);
    }

    await api.post("/admin/apps", data);
    createStatus.textContent = "Saved ✅";
    createCard.style.display="none";
    createForm.reset();
    galleryPreview.innerHTML="";
    await load();
  }catch(err){
    createStatus.textContent = err?.message || String(err);
  }
});

load();
