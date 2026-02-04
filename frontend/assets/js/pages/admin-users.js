// /assets/js/pages/admin-users.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();

const qInput = document.getElementById("q");
const tableBody = document.querySelector("#usersTable tbody");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

let allUsers = [];

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
    tableBody.innerHTML = `<tr><td class="muted" colspan="7">No customers found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(u => {
    const id = u.id ?? u._id ?? "";
    const name = u.name ?? u.fullName ?? "—";
    const email = u.email ?? "—";
    const phone = u.phone ?? u.mobile ?? "—";
    const joined = u.createdAt ?? u.joinedAt ?? null;
    const lastLogin = u.lastLoginAt ?? null;

    return `
      <tr>
        <td>${escapeHtml(String(id).slice(-6))}</td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${escapeHtml(phone)}</td>
        <td>${escapeHtml(formatDate(joined))}</td>
        <td>${escapeHtml(formatDate(lastLogin))}</td>
        <td>
          <a class="btn" href="user-view.html?id=${encodeURIComponent(id)}">View</a>
        </td>
      </tr>
    `;
  }).join("");
}

function applyFilter() {
  const q = (qInput.value || "").trim().toLowerCase();
  if (!q) return renderRows(allUsers);

  const filtered = allUsers.filter(u => {
    const name = String(u.name ?? u.fullName ?? "").toLowerCase();
    const email = String(u.email ?? "").toLowerCase();
    const phone = String(u.phone ?? u.mobile ?? "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  renderRows(filtered);
}

async function loadUsers() {
  statusEl.textContent = "Loading customers…";
  try {
    // Backend should return: [{id/_id,name,email,phone,createdAt}]
    const data = await api.get("/admin/users");
    allUsers = Array.isArray(data) ? data : (data.items || []);
    statusEl.textContent = "";
    applyFilter();
  } catch (e) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="7">Failed to load customers.</td></tr>`;
    statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Error";
  }
}

qInput.addEventListener("input", applyFilter);

loadUsers();
