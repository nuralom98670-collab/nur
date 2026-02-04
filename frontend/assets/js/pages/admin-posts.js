// /assets/js/pages/admin-posts.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();

const qInput = document.getElementById("q");
const tableBody = document.querySelector("#postsTable tbody");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

let allPosts = [];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function renderRows(list) {
  countBadge.textContent = String(list.length);

  if (!list.length) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="5">No posts found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(p => {
    const id = p.id ?? p._id ?? "";
    const title = p.title ?? "—";
    const status = p.status ?? (p.published ? "published" : "draft");
    const updated = p.updatedAt ?? p.createdAt ?? null;

    return `
      <tr>
        <td>${escapeHtml(String(id).slice(-6))}</td>
        <td>${escapeHtml(title)}</td>
        <td>${escapeHtml(String(status))}</td>
        <td>${escapeHtml(formatDate(updated))}</td>
        <td>
          <a class="btn" href="post-edit.html?id=${encodeURIComponent(id)}">Edit</a>
          <button class="btn" data-del="${escapeHtml(String(id))}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  // delete handlers
  tableBody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!id) return;

      const ok = confirm("Delete this post?");
      if (!ok) return;

      btn.disabled = true;
      btn.textContent = "Deleting…";

      try {
        await api.del(`/admin/posts/${encodeURIComponent(id)}`);
        allPosts = allPosts.filter(x => String(x.id ?? x._id) !== String(id));
        applyFilter();
        statusEl.textContent = "Deleted.";
      } catch (e) {
        statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Delete failed";
        btn.disabled = false;
        btn.textContent = "Delete";
      }
    });
  });
}

function applyFilter() {
  const q = (qInput.value || "").trim().toLowerCase();
  if (!q) return renderRows(allPosts);

  const filtered = allPosts.filter(p => {
    const title = String(p.title ?? "").toLowerCase();
    return title.includes(q);
  });

  renderRows(filtered);
}

async function loadPosts() {
  statusEl.textContent = "Loading posts…";
  try {
    // Backend should return: [{id/_id,title,status,updatedAt}]
    const data = await api.get("/admin/posts");
    allPosts = Array.isArray(data) ? data : (data.items || []);
    statusEl.textContent = "";
    applyFilter();
  } catch (e) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="5">Failed to load posts.</td></tr>`;
    statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Error";
  }
}

qInput.addEventListener("input", applyFilter);

loadPosts();
