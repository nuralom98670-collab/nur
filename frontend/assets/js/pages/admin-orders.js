// /assets/js/pages/admin-orders.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();

const qInput = document.getElementById("q");
const statusFilter = document.getElementById("statusFilter");
const tableBody = document.querySelector("#ordersTable tbody");
const countBadge = document.getElementById("countBadge");
const statusEl = document.getElementById("status");

let allOrders = [];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(n) {
  const num = Number(n || 0);
  return `৳${num.toFixed(2)}`;
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(); // browser locale
}

function renderRows(list) {
  countBadge.textContent = String(list.length);

  if (!list.length) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="6">No orders found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(o => {
    const id = o.id ?? o._id ?? "";
    const customer = o.customer?.name ?? o.user?.name ?? o.customerName ?? "—";
    const status = o.status ?? "—";
    const total = o.total ?? o.grandTotal ?? 0;
    const created = o.createdAt ?? o.date ?? o.placedAt ?? null;

    return `
      <tr>
        <td>#${escapeHtml(String(id).slice(-8))}</td>
        <td>${escapeHtml(customer)}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(money(total))}</td>
        <td>${escapeHtml(formatDate(created))}</td>
        <td>
          ${(String(status).toLowerCase()==="pending") ? `<button class="btn" data-confirm="${encodeURIComponent(id)}">Confirm</button> <button class="btn danger" data-reject="${encodeURIComponent(id)}">Reject</button>` : ""}
          <a class="btn" href="order-view.html?id=${encodeURIComponent(id)}">View</a>
        </td>
      </tr>
    `;
  }).join("");
}

function applyFilter() {
  const q = (qInput.value || "").trim().toLowerCase();
  const st = (statusFilter.value || "").trim().toLowerCase();

  let filtered = allOrders;

  if (st) {
    filtered = filtered.filter(o => String(o.status ?? "").toLowerCase() === st);
  }

  if (q) {
    filtered = filtered.filter(o => {
      const id = String(o.id ?? o._id ?? "").toLowerCase();
      const name = String(o.customer?.name ?? o.user?.name ?? o.customerName ?? "").toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }

  renderRows(filtered);
}

async function loadOrders() {
  statusEl.textContent = "Loading orders…";
  try {
    // Backend should return: [{id/_id,status,total,createdAt, customer:{name}}]
    const data = await api.get("/admin/orders");
    allOrders = Array.isArray(data) ? data : (data.items || []);
    statusEl.textContent = "";
    applyFilter();
  } catch (e) {
    tableBody.innerHTML = `<tr><td class="muted" colspan="6">Failed to load orders.</td></tr>`;
    statusEl.textContent = (typeof e === "string" ? e : e?.message) || "Error";
  }
}

qInput.addEventListener("input", applyFilter);
statusFilter.addEventListener("change", applyFilter);

loadOrders();


tableBody.addEventListener("click", async (e) => {
  const confirmBtn = e.target.closest("[data-confirm]");
  const rejectBtn = e.target.closest("[data-reject]");
  const id = confirmBtn?.getAttribute("data-confirm") || rejectBtn?.getAttribute("data-reject");
  if(!id) return;

  const next = confirmBtn ? "confirmed" : "rejected";
  const msg = confirmBtn ? "Confirm this order?" : "Reject this order?";
  if(!confirm(msg)) return;

  try{
    await api.put(`/admin/orders/${encodeURIComponent(id)}/status`, { status: next });
    await loadOrders();
  }catch(err){
    alert(err?.message || `Failed to update: ${next}`);
  }
});
