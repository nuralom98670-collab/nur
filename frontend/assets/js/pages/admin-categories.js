// /assets/js/pages/admin-categories.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();

const qInput = document.getElementById("q");
const openCreateBtn = document.getElementById("openCreate");
const createCard = document.getElementById("createCard");
const createForm = document.getElementById("createForm");
const cancelCreate = document.getElementById("cancelCreate");
const createStatus = document.getElementById("createStatus");
const tableBody = document.querySelector("#categoriesTable tbody");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

let allCategories = [];

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
    tableBody.innerHTML = `<tr><td class="muted" colspan="5">No categories found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(c => {
    const id = c.id ?? c._id ?? "";
    const name = c.label ?? "—";
    const slug = c.key ?? "—";
    const kind = c.kind ?? "shop";
    const updated = c.updatedAt ?? c.createdAt ?? null;

    return `
      <tr>
        <td>${escapeHtml(String(id).slice(-6))}</td>
        <td>${escapeHtml(name)} <span class="badge" style="margin-left:6px;">${escapeHtml(kind)}</span></td>
        <td>${escapeHtml(slug)}</td>
        <td>${escapeHtml(formatDate(updated))}</td>
        <td>
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

      const ok = confirm("Delete this category?");
      if (!ok) return;

      btn.disabled = true;
      btn.textContent = "Deleting…";

      try {
        await api.del(`/admin/categories/${encodeURIComponent(id)}`);
        allCategories = allCategories.filter(x => String(x.id ?? x._id) !== String(id));
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
  if (!q) return renderRows(allCategories);

  const filtered = allCategories.filter(c => {
    const name = String(c.label ?? c.name ?? "").toLowerCase();
    const slug = String(c.key ?? c.slug ?? "").toLowerCase();
    return name.includes(q) || slug.includes(q);
  });

  renderRows(filtered);
}

async function loadCategories() {
  statusEl.textContent = "Loading categories…";
  try {
    // Backend should return: [{id/_id,name,slug,updatedAt}]
    const data = await api.get("/admin/categories");
    allCategories = Array.isArray(data) ? data : (data.items || []);
    statusEl.textContent = "";
    applyFilter();
  } catch (e) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="5">Failed to load categories.</td></tr>`;
    statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Error";
  }
}

openCreateBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  if(createCard) createCard.style.display = "block";
});

cancelCreate?.addEventListener("click", ()=>{
  if(createCard) createCard.style.display = "none";
  createStatus.textContent = "";
  createForm.reset();
});

createForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  createStatus.textContent = "Saving…";
  const payload = Object.fromEntries(new FormData(createForm).entries());
  try{
    const out = await api.post("/admin/categories", payload);
    allCategories.unshift(out);
    createStatus.textContent = "Created ✅";
    applyFilter();
    setTimeout(()=>{ if(createCard) createCard.style.display="none"; }, 600);
  }catch(err){
    createStatus.textContent = (typeof err === "string" ? err : err?.message) || "Create failed";
  }
});

qInput.addEventListener("input", applyFilter);

loadCategories();
