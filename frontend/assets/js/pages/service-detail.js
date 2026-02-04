import "../core/site-ui.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const statusEl = document.getElementById("status");
const coverEl = document.getElementById("cover");
const bodyEl = document.getElementById("body");
const priceEl = document.getElementById("price");
const needFilesEl = document.getElementById("needFiles");
const hintEl = document.getElementById("hint");

const reqForm = document.getElementById("reqForm");
const reqStatus = document.getElementById("reqStatus");
const filesInput = document.getElementById("files");
const imagesInput = document.getElementById("images");
const imgPrev = document.getElementById("imgPrev");

const cartCountEl = document.getElementById("cartCount");
function getCart() { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
cartCountEl.textContent = String(getCart().reduce((s, x) => s + Number(x.qty || 1), 0));

function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function renderGalleryPreview(files){
  if (!imgPrev) return;
  imgPrev.innerHTML = "";
  Array.from(files||[]).forEach(f=>{
    const url = URL.createObjectURL(f);
    const d = document.createElement("div");
    d.className = "card";
    d.style.padding = "8px";
    d.innerHTML = `<img src="${url}" alt="" style="width:100%; height:100px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />`;
    imgPrev.appendChild(d);
  });
}
imagesInput?.addEventListener("change", (e)=>renderGalleryPreview(e.target.files));

let service = null;

async function uploadMany(endpoint, files){
  const urls = [];
  for (let i=0;i<files.length;i++){
    reqStatus.textContent = `Uploading ${i+1}/${files.length}…`;
    const fd = new FormData();
    fd.append("file", files[i]);
    const r = await fetch(`/api/public/${endpoint}`, { method:"POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || data?.message || "Upload failed");
    urls.push(data.url);
  }
  return urls;
}

async function load(){
  const sp = new URLSearchParams(location.search);
  const id = sp.get("id");
  if (!id){
    titleEl.textContent = "Missing service";
    statusEl.textContent = "Missing ?id";
    return;
  }
  statusEl.textContent = "Loading…";
  try{
    const r = await fetch(`/api/public/service-items/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("Not found");
    service = await r.json();

    document.title = `${service.title || "Service"} • RoboticsLeb`;
    titleEl.textContent = service.title || "Service";
    metaEl.textContent = service.updatedAt ? new Date(service.updatedAt).toLocaleString() : "";
    bodyEl.textContent = service.body || "";
    priceEl.textContent = `৳${Number(service.price||0).toFixed(2)}`;

    if (service.imageUrl){
      coverEl.src = service.imageUrl;
      coverEl.style.display = "block";
    }

    if (Number(service.needsFiles||0)){
      needFilesEl.style.display = "inline-flex";
      hintEl.textContent = service.filesHint || "Please upload the required files.";
    }else{
      hintEl.textContent = service.filesHint || "Attach files/images if needed.";
    }
    statusEl.textContent = "";
  }catch(err){
    statusEl.textContent = "Service not found";
  }
}

reqForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if (!service) return;
  reqStatus.textContent = "Sending…";
  try{
    const data = Object.fromEntries(new FormData(reqForm).entries());
    data.serviceId = service.id;

    const fileUrls = filesInput?.files?.length ? await uploadMany("upload-file", Array.from(filesInput.files)) : [];
    const imageUrls = imagesInput?.files?.length ? await uploadMany("upload-image", Array.from(imagesInput.files)) : [];

    const payload = {
      serviceId: data.serviceId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      note: data.note,
      filesJson: JSON.stringify(fileUrls),
      imagesJson: JSON.stringify(imageUrls)
    };

    const r = await fetch("/api/public/service-requests", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const out = await r.json();
    if (!r.ok) throw new Error(out?.error || out?.message || "Failed");
    reqStatus.textContent = "Request sent ✅";
    reqForm.reset();
    if (imgPrev) imgPrev.innerHTML = "";
  }catch(err){
    reqStatus.textContent = err?.message || String(err);
  }
});

load();
