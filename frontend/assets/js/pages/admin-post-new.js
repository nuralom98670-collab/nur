import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

// This page must behave like Product Add:
//  - Pick multiple images
//  - Preview and remove
//  - Save everything in ONE multipart request (/admin/posts-multipart)
//  - Allow inserting images into body with size/alignment BEFORE saving (using placeholders)

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const form = document.getElementById("postForm");
const statusEl = document.getElementById("status");

const coverInput = document.getElementById("coverFile");
const coverPreview = document.getElementById("coverPreview");

const galleryInput = document.getElementById("galleryFiles");
const galleryPreview = document.getElementById("galleryPreview");

const categorySelect = document.getElementById("categorySelect");
const bodyInput = document.getElementById("bodyInput") || form?.body;

const videoUrlInput = document.getElementById("videoUrl");
const insertVideoBtn = document.getElementById("insertVideoBtn");

// Keep a local array of selected files (same as product page)
let selectedFiles = [];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadBlogCategories() {
  if (!categorySelect) return;
  try {
    const list = await api.get("/admin/categories?kind=blog");
    const items = Array.isArray(list) ? list : (list.items || []);
    categorySelect.innerHTML = `<option value="">— Select —</option>` + items
      .map((c) => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`)
      .join("");
  } catch {
    // ignore
  }
}

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = before + text + after;
  const pos = start + text.length;
  textarea.setSelectionRange(pos, pos);
  textarea.focus();
}

function wrapSelection(textarea, before, after) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selected = textarea.value.slice(start, end) || "Heading";
  const out = `${before}${selected}${after}`;
  textarea.setRangeText(out, start, end, "end");
  textarea.focus();
}

// Toolbar bindings (unchanged)
document.querySelectorAll("[data-h]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const h = btn.getAttribute("data-h");
    wrapSelection(bodyInput, `<h${h}>`, `</h${h}>`);
  });
});

document.querySelectorAll("[data-wrap]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const before = btn.getAttribute("data-wrap") || "";
    const tag = before.match(/^<([a-zA-Z0-9]+)/)?.[1] || "b";
    wrapSelection(bodyInput, before, `</${tag}>`);
  });
});

document.querySelectorAll("[data-insert]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const html = btn.getAttribute("data-insert") || "";
    insertAtCursor(bodyInput, `\n${html}\n`);
  });
});

document.querySelectorAll("[data-list]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const t = btn.getAttribute("data-list");
    const start = bodyInput.selectionStart ?? 0;
    const end = bodyInput.selectionEnd ?? 0;
    const sel = bodyInput.value.slice(start, end).trim();
    const items = sel
      ? sel.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      : ["Item 1", "Item 2"];
    const html = `<${t}>\n` + items.map((i) => `  <li>${i}</li>`).join("\n") + `\n</${t}>`;
    bodyInput.setRangeText(html, start, end, "end");
    bodyInput.focus();
  });
});

document.querySelectorAll("[data-link]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = prompt("Link URL (https://...)");
    if (!url) return;
    wrapSelection(
      bodyInput,
      `<a href=\"${url}\" target=\"_blank\" rel=\"noopener\">`,
      "</a>"
    );
  });
});

function videoEmbedFromUrl(url) {
  const u = String(url || "").trim();
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
  coverPreview.src = URL.createObjectURL(file);
  coverPreview.style.display = "block";
});

function addFilesFromInput() {
  const files = Array.from(galleryInput?.files || []);
  if (!files.length) return;
  for (const f of files) selectedFiles.push(f);
  renderGalleryPreview();
  // reset so selecting same file triggers change again
  galleryInput.value = "";
}

function imageMarkupForIndex(i, width, align) {
  const a = String(align || "center").toLowerCase();
  const margin = a === "left" ? "0 auto 14px 0" : (a === "right" ? "0 0 14px auto" : "0 auto 14px auto");
  // IMPORTANT: src is a placeholder. Backend replaces {{UPLOAD:i}} with actual url.
  return `\n<img src=\"{{UPLOAD:${i}}}\" alt=\"\" style=\"width:${width}%; max-width:100%; height:auto; display:block; margin:${margin};\" />\n`;
}

function renderGalleryPreview() {
  if (!galleryPreview) return;
  galleryPreview.innerHTML = "";

  if (!selectedFiles.length) {
    galleryPreview.innerHTML = `<div class=\"muted\" style=\"grid-column:1/-1;\">No images selected.</div>`;
    return;
  }

  selectedFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "card";
    card.style.padding = "10px";
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="muted" style="font-size:12px; font-weight:800;">Image ${idx + 1}</div>
        <button class="btn" type="button" data-rm="${idx}" style="padding:6px 10px;">Remove</button>
      </div>
      <div style="height:8px"></div>
      <img src="${url}" alt="" style="width:100%; height:110px; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.08);" />
      <div style="height:10px"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <label class="muted" style="font-size:12px;">Size</label>
        <select class="input" data-size="${idx}" style="max-width:110px; padding:8px 10px;">
          <option value="100">100%</option>
          <option value="75">75%</option>
          <option value="50">50%</option>
          <option value="33">33%</option>
          <option value="25">25%</option>
        </select>
        <label class="muted" style="font-size:12px; margin-left:6px;">Align</label>
        <select class="input" data-align="${idx}" style="max-width:120px; padding:8px 10px;">
          <option value="center">Center</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
        <button class="btn" type="button" data-insert="${idx}">Insert</button>
      </div>
    `;
    galleryPreview.appendChild(card);
  });

  // Remove
  galleryPreview.querySelectorAll("[data-rm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-rm"));
      if (!Number.isFinite(i)) return;
      selectedFiles = selectedFiles.filter((_, k) => k !== i);
      renderGalleryPreview();
    });
  });

  // Insert (placeholder markup)
  galleryPreview.querySelectorAll("[data-insert]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-insert"));
      if (!Number.isFinite(i)) return;
      const sizeSel = galleryPreview.querySelector(`[data-size=\"${i}\"]`);
      const alignSel = galleryPreview.querySelector(`[data-align=\"${i}\"]`);
      const width = Math.max(10, Math.min(100, Number(sizeSel?.value || 100))) || 100;
      const align = alignSel?.value || "center";
      insertAtCursor(bodyInput, imageMarkupForIndex(i, width, align));
    });
  });
}

galleryInput?.addEventListener("change", addFilesFromInput);

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Saving…";

  try {
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.videoUrl) data.videoUrl = String(data.videoUrl).trim();

    // category label
    if (categorySelect) {
      const opt = categorySelect.options[categorySelect.selectedIndex];
      data.categoryLabel = (opt && opt.value) ? opt.textContent.trim() : null;
    }

    // Send everything as multipart (like product page) so Save never fails due to separate uploads.
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v ?? ""));

    // cover
    const cover = coverInput?.files?.[0];
    if (cover) fd.append("cover", cover);

    // gallery images (order matters for {{UPLOAD:i}} placeholders)
    selectedFiles.forEach((f) => fd.append("images", f));

    await api.postForm("/admin/posts-multipart", fd);
    statusEl.textContent = "Saved ✅";
    location.href = "./posts";
  } catch (err) {
    statusEl.textContent = err?.message || String(err);
  }
});

loadBlogCategories();
renderGalleryPreview();
