import "../core/site-ui.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const titleEl = document.getElementById("title");
const metaEl = document.getElementById("meta");
const bodyEl = document.getElementById("body");
const coverEl = document.getElementById("coverImg");
const videoEl = document.getElementById("video");
const statusEl = document.getElementById("status");
const moreEl = document.getElementById("more");
const cartCountEl = document.getElementById("cartCount");

// Apply consistent typography/styles to post body (especially images)
bodyEl?.classList.add("post-content");

function getCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}
cartCountEl.textContent = String(getCart().reduce((s, x) => s + Number(x.qty || 1), 0));

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripTags(html){
  return String(html||"")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHtml(html) {
  // Basic sanitizer (admin-controlled content). Removes scripts + inline event handlers.
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function decodeEntities(str){
  // Decode up to 3 times to handle double-escaped content like &amp;lt;p&amp;gt;
  let s = String(str || '');
  for (let i=0;i<3;i++){
    if (!/&(lt|gt|amp|quot|#039);/i.test(s)) break;
    const t = document.createElement('textarea');
    t.innerHTML = s;
    const next = t.value;
    if (next === s) break;
    s = next;
  }
  return s;
}

function renderBody(text) {
  // First, try to decode escaped HTML entities if present
  const decoded = decodeEntities(text);
  const raw = String(decoded || "");
  const hasTags = /<\w+[^>]*>/.test(raw);

  if (hasTags) {
    // Allow simple HTML like <img>, <p>, <br>, etc.
    return sanitizeHtml(raw);
  }

  // Fallback: split blank lines into paragraphs (plain text)
  const parts = raw.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (!parts.length) return "<div class=\"muted\">No content.</div>";
  return parts.map(p => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`).join("");
}


function renderGallery(urls=[]){
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (!list.length) return '';
  // Simple responsive gallery
  return `
    <div style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
` +
      list.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" class="card" style="padding:0; overflow:hidden; border-radius:16px;">`+
        `<img src="${escapeHtml(u)}" alt="" style="width:100%; height:160px; object-fit:cover; display:block;" />`+
      `</a>`).join('') +
    `
    </div>`;
}

function videoEmbedFromUrl(url){
  const u = String(url||"").trim();
  if (!u) return "";
  const ytId = (() => {
    const m1 = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m1) return m1[1];
    const m2 = u.match(/v=([A-Za-z0-9_-]{6,})/);
    if (m2) return m2[1];
    const m3 = u.match(/embed\/([A-Za-z0-9_-]{6,})/);
    if (m3) return m3[1];
    return null;
  })();
  let src = "";
  if (ytId) src = `https://www.youtube.com/embed/${ytId}`;
  const vm = !src ? u.match(/vimeo\.com\/(\d{6,})/) : null;
  if (!src && vm) src = `https://player.vimeo.com/video/${vm[1]}`;
  // Facebook best-effort via plugins
  if (!src && /facebook\.com\//.test(u) && /\/videos\//.test(u)) {
    const enc = encodeURIComponent(u);
    src = `https://www.facebook.com/plugins/video.php?href=${enc}&show_text=0&width=560`;
  }
  // already an iframe snippet
  if (!src && u.includes("<iframe") && u.includes("</iframe>")) {
    return `<div style="position:relative; width:100%; padding-top:56.25%;">
      ${u.replace("<iframe", "<iframe style=\"position:absolute; inset:0; width:100%; height:100%; border:0; border-radius:16px;\"")}
    </div>`;
  }
  if (!src) return "";
  return `<div style="position:relative; width:100%; padding-top:56.25%;">
    <iframe src="${escapeHtml(src)}" title="Video" style="position:absolute; inset:0; width:100%; height:100%; border:0; border-radius:16px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  </div>`;
}

function card(p) {
  const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "";
  const plain = stripTags(decodeEntities(p.body || ""));
  const excerpt = plain.length > 90 ? plain.slice(0, 90) + "…" : plain;
  return `
    <a class="card linkcard" href="./blog-post?id=${encodeURIComponent(p.id)}" style="padding:16px;">
      <div class="muted">${escapeHtml(date)}</div>
      <h3 style="margin:8px 0 6px;">${escapeHtml(p.title || "Untitled")}</h3>
      <p class="muted" style="margin:0; line-height:1.6;">${escapeHtml(excerpt)}</p>
    </a>
  `;
}

async function load() {
  const sp = new URLSearchParams(location.search);
  const id = sp.get("id");
  if (!id) {
    titleEl.textContent = "Missing post id";
    metaEl.textContent = "";
    statusEl.textContent = "Missing ?id in URL.";
    bodyEl.innerHTML = "";
    return;
  }

  statusEl.textContent = "Loading…";
  try {
    const res = await fetch(`/api/public/posts/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Not found");
    const post = await res.json();
    document.title = `${post.metaTitle || post.title || "Post"} • RoboticsLeb`;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", post.metaDescription || "");

    titleEl.textContent = post.title || "Post";
    metaEl.textContent = post.createdAt ? new Date(post.createdAt).toLocaleString() : "";

    // Avoid rendering the same images twice.
    // If a gallery image URL is already present in the post body (<img src="...">),
    // we skip it in the top gallery.
    const decodedBody = decodeEntities(post.body || "");
    const bodyTextForMatch = String(decodedBody || "");
    const imgs = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
    const galleryOnly = imgs.filter(u => !bodyTextForMatch.includes(String(u)));

    const galleryHtml = renderGallery(galleryOnly);
    bodyEl.innerHTML = galleryHtml + renderBody(post.body || "");
    statusEl.textContent = "";

    // Optional video embed (shown above body)
    if (videoEl) {
      const vHtml = post.videoUrl ? videoEmbedFromUrl(post.videoUrl) : "";
      if (vHtml) {
        videoEl.innerHTML = vHtml;
        videoEl.style.display = "block";
      } else {
        videoEl.innerHTML = "";
        videoEl.style.display = "none";
      }
    }

    if (post.coverImageUrl) {
      coverEl.src = post.coverImageUrl;
      coverEl.style.display = "block";
    } else {
      coverEl.style.display = "none";
    }

    // More posts
    const listRes = await fetch("/api/public/posts");
    const data = await listRes.json();
    const items = (data.items || []).filter(p => p.id !== post.id).slice(0, 3);
    moreEl.innerHTML = items.length ? items.map(card).join("") : `<div class="muted">No more posts.</div>`;
  } catch (e) {
    titleEl.textContent = "Post not found";
    metaEl.textContent = "";
    statusEl.textContent = "This post is not available (only published posts are visible).";
    bodyEl.innerHTML = "";
    if (videoEl) { videoEl.innerHTML = ""; videoEl.style.display = "none"; }
    moreEl.innerHTML = "";
  }
}

load();
