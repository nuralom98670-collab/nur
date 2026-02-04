import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const form = document.getElementById("postForm");
const statusEl = document.getElementById("status");
const badge = document.getElementById("postIdBadge");

const coverInput = document.getElementById("coverFile");
const coverPreview = document.getElementById("coverPreview");

const galleryInput = document.getElementById("galleryFiles");
const galleryPreview = document.getElementById("galleryPreview");
const categorySelect = document.getElementById("categorySelect");
const bodyInput = document.getElementById("bodyInput") || form?.body;
const videoUrlInput = document.getElementById("videoUrl");
const insertVideoBtn = document.getElementById("insertVideoBtn");

// Store uploaded post images (for gallery / SEO)
let uploadedGalleryUrls = [];

const id = new URLSearchParams(location.search).get("id");
if (!id) location.href = "./posts";

function showCover(url) {
  if (!coverPreview) return;
  if (!url) {
    coverPreview.style.display = "none";
    coverPreview.src = "";
    return;
  }
  coverPreview.src = url;
  coverPreview.style.display = "block";
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.setRangeText(text, start, end, "end");
  textarea.focus();
}

function wrapSelection(textarea, before, after){
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selected = textarea.value.slice(start, end) || "Heading";
  textarea.setRangeText(`${before}${selected}${after}`, start, end, "end");
  textarea.focus();
}

document.querySelectorAll("[data-h]").forEach(btn => {
  btn.addEventListener("click", () => {
    const h = btn.getAttribute("data-h");
    wrapSelection(bodyInput, `<h${h}>`, `</h${h}>`);
  });
});

// Same WordPress-like inline formatting toolbar as "New Post"
document.querySelectorAll("[data-wrap]").forEach(btn => {
  btn.addEventListener("click", () => {
    const before = btn.getAttribute("data-wrap") || "";
    const tag = before.match(/^<([a-zA-Z0-9]+)/)?.[1] || "b";
    wrapSelection(bodyInput, before, `</${tag}>`);
  });
});

document.querySelectorAll("[data-insert]").forEach(btn => {
  btn.addEventListener("click", () => {
    const html = btn.getAttribute("data-insert") || "";
    insertAtCursor(bodyInput, `\n${html}\n`);
  });
});

document.querySelectorAll("[data-list]").forEach(btn => {
  btn.addEventListener("click", () => {
    const t = btn.getAttribute("data-list");
    const start = bodyInput.selectionStart ?? 0;
    const end = bodyInput.selectionEnd ?? 0;
    const sel = bodyInput.value.slice(start, end).trim();
    const items = sel ? sel.split(/\n+/).map(s=>s.trim()).filter(Boolean) : ["Item 1","Item 2"];
    const html = `<${t}>\n` + items.map(i=>`  <li>${i}</li>`).join("\n") + `\n</${t}>`;
    bodyInput.setRangeText(html, start, end, "end");
    bodyInput.focus();
  });
});

document.querySelectorAll("[data-link]").forEach(btn => {
  btn.addEventListener("click", () => {
    const url = prompt("Link URL (https://...)");
    if (!url) return;
    wrapSelection(bodyInput, `<a href=\"${url}\" target=\"_blank\" rel=\"noopener\">`, `</a>`);
  });
});

function videoEmbedFromUrl(url){
  const u = String(url||"").trim();
  if (!u) return null;

  const ytId = (() => {
    const m1 = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m1) return m1[1];
    const m2 = u.match(/v=([A-Za-z0-9_-]{6,})/);
    if (m2) return m2[1];
    const m3 = u.match(/embed\/([A-Za-z0-9_-]{6,})/);
    if (m3) return m3[1];
    return null;
  })();
  if (ytId) {
    return `\n<div class=\"video-embed\"><iframe src=\"https://www.youtube.com/embed/${ytId}\" title=\"YouTube video\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe></div>\n`;
  }

  const vm = u.match(/vimeo\.com\/(\d{6,})/);
  if (vm) {
    return `\n<div class=\"video-embed\"><iframe src=\"https://player.vimeo.com/video/${vm[1]}\" title=\"Vimeo video\" frameborder=\"0\" allow=\"autoplay; fullscreen; picture-in-picture\" allowfullscreen></iframe></div>\n`;
  }

  if (/facebook\.com\//.test(u) && /\/videos\//.test(u)) {
    const enc = encodeURIComponent(u);
    return `\n<div class=\"video-embed\"><iframe src=\"https://www.facebook.com/plugins/video.php?href=${enc}&show_text=0&width=560\" title=\"Facebook video\" frameborder=\"0\" allow=\"autoplay; clipboard-write; encrypted-media; picture-in-picture\" allowfullscreen></iframe></div>\n`;
  }

  if (u.includes("<iframe") && u.includes("</iframe>")) {
    return `\n<div class=\"video-embed\">${u}</div>\n`;
  }

  return null;
}

insertVideoBtn?.addEventListener("click", () => {
  const url = (videoUrlInput?.value || "").trim() || prompt("Paste video URL (YouTube/Facebook/Vimeo)", "");
  if (!url) return;
  const html = videoEmbedFromUrl(url);
  if (!html) {
    alert("Unsupported video link. Please paste a YouTube/Facebook/Vimeo URL.");
    return;
  }
  if (videoUrlInput) videoUrlInput.value = url;
  insertAtCursor(bodyInput, html);
});


coverInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  showCover(URL.createObjectURL(file));
});

async function handleGalleryFiles(files) {
  if (!galleryPreview) return;
  const list = Array.from(files || []);
  if (!list.length) return;

  for (const file of list) {
    const tile = document.createElement("div");
    tile.className = "card";
    tile.style.padding = "10px";
    tile.innerHTML = `
      <div class="muted" style="font-size:12px;">Uploading…</div>
      <div style="height:8px"></div>
      <img style="width:100%; height:110px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />
      <div style="height:10px"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" type="button" disabled>Insert</button>
        <button class="btn" type="button" disabled>Copy URL</button>
      </div>
    `;
    const img = tile.querySelector("img");
    const insertBtn = tile.querySelectorAll("button")[0];
    const copyBtn = tile.querySelectorAll("button")[1];

    img.src = URL.createObjectURL(file);
    galleryPreview.prepend(tile);

    try {
      statusEl.textContent = "Uploading image…";
      const up = await api.upload("/admin/upload-image", file, "file");
      const url = up?.url;
      if (url) uploadedGalleryUrls.unshift(url);

      tile.querySelector(".muted").textContent = url ? "Uploaded ✅" : "Uploaded";
      insertBtn.disabled = false;
      copyBtn.disabled = false;

      insertBtn.addEventListener("click", () => {
        insertAtCursor(bodyInput, `\n<img src=\"${url}\" alt=\"\" />\n`);
      });

      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(url);
          copyBtn.textContent = "Copied";
          setTimeout(() => (copyBtn.textContent = "Copy URL"), 800);
        } catch {
          alert(url);
        }
      });
    } catch (err) {
      tile.querySelector(".muted").textContent = "Upload failed";
      console.error(err);
    } finally {
      statusEl.textContent = "";
    }
  }
}

galleryInput?.addEventListener("change", (e) => {
  handleGalleryFiles(e.target.files);
  e.target.value = "";
});

function addExistingGallery(urls=[]){
  if (!galleryPreview) return;
  const list = Array.isArray(urls) ? urls : [];
  // Render from oldest to newest so newest appears top (we prepend)
  for (const url of list.slice().reverse()){
    if (!url) continue;
    const tile = document.createElement("div");
    tile.className = "card";
    tile.style.padding = "10px";
    tile.innerHTML = `
      <div class="muted" style="font-size:12px;">Existing</div>
      <div style="height:8px"></div>
      <img src="${url}" style="width:100%; height:110px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />
      <div style="height:10px"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" type="button">Insert</button>
        <button class="btn" type="button">Copy URL</button>
      </div>
    `;
    const insertBtn = tile.querySelectorAll("button")[0];
    const copyBtn = tile.querySelectorAll("button")[1];

    insertBtn.addEventListener("click", () => {
      const w = prompt("Image width? (type number as percent: 100 = full, 50 = half)", "100");
      const width = Math.max(10, Math.min(100, Number(w || 100))) || 100;
      const align = prompt("Align? (left / center / right)", "center");
      const a = (align || "center").trim().toLowerCase();
      const margin = a === "left" ? "0 auto 14px 0" : (a === "right" ? "0 0 14px auto" : "0 auto 14px auto");
      insertAtCursor(bodyInput, `
<img src="${url}" alt="" style="width:${width}%; max-width:100%; height:auto; display:block; margin:${margin};" />
`);
    });

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy URL"), 800);
      } catch {
        alert(url);
      }
    });

    galleryPreview.prepend(tile);
  }
}

async function load() {
  // Load blog categories for selector
  if (categorySelect) {
    try {
      const list = await api.get("/admin/categories?kind=blog");
      const items = Array.isArray(list) ? list : (list.items || []);
      categorySelect.innerHTML = `<option value="">— Select —</option>` + items
        .map(c => `<option value="${c.key}">${c.label}</option>`)
        .join("");
    } catch {}
  }

  const p = await api.get(`/admin/posts/${id}`);
  badge.textContent = p.id;

  form.title.value = p.title || "";
  form.metaTitle.value = p.metaTitle || "";
  form.metaDescription.value = p.metaDescription || "";
  form.status.value = p.status || "draft";
  form.slug.value = p.slug || "";
  if (videoUrlInput) videoUrlInput.value = p.videoUrl || "";
  if (categorySelect) categorySelect.value = p.categoryKey || "";
  bodyInput.value = p.body || "";
  showCover(p.coverImageUrl || "");
  // Load existing post images gallery
  uploadedGalleryUrls = Array.isArray(p.images) ? p.images.slice() : [];
  addExistingGallery(uploadedGalleryUrls);
}

load().catch((e) => (statusEl.textContent = e?.message || String(e)));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Saving…";

  const data = Object.fromEntries(new FormData(form).entries());
  if (uploadedGalleryUrls.length) data.imagesJson = JSON.stringify(uploadedGalleryUrls);

  if (categorySelect){
    const opt = categorySelect.options[categorySelect.selectedIndex];
    data.categoryLabel = (opt && opt.value) ? opt.textContent.trim() : null;
  }

  try {
    const file = coverInput?.files?.[0];
    if (file) {
      statusEl.textContent = "Uploading cover…";
      const up = await api.upload("/admin/upload-image", file, "file");
      data.coverImageUrl = up.url;
    }

    await api.put(`/admin/posts/${id}`, data);
    statusEl.textContent = "Updated ✅";
    location.href = "./posts";
  } catch (err) {
    statusEl.textContent = err?.message || String(err);
  }
});

document.getElementById("deleteBtn")?.addEventListener("click", async () => {
  if (!confirm("Delete this post?")) return;
  try {
    await api.del(`/admin/posts/${id}`);
    location.href = "./posts";
  } catch (err) {
    alert(err?.message || String(err));
  }
});
