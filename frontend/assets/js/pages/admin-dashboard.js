// /assets/js/pages/admin-dashboard.js
import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();

const kpiEls = {
  totalProducts: document.querySelector('[data-kpi="totalProducts"]'),
  totalOrders: document.querySelector('[data-kpi="totalOrders"]'),
  totalUsers: document.querySelector('[data-kpi="totalUsers"]'),
  revenue: document.querySelector('[data-kpi="revenue"]'),
};

const lowStockTbody = document.querySelector("#lowStockTable tbody");
const newOrdersTbody = document.querySelector("#newOrdersTable tbody");
const serviceReqTbody = document.querySelector("#serviceReqTable tbody");
const notifBadge = document.getElementById("notifBadge");

// Open notifications page
notifBadge?.addEventListener("click", () => {
  location.href = "notifications";
});

function safeText(el, value) {
  if (!el) return;
  el.textContent = value ?? "—";
}

function money(n) {
  const num = Number(n || 0);
  return num.toFixed(2);
}

function renderEmptyRow(tbody, cols, text) {
  tbody.innerHTML = `<tr><td class="muted" colspan="${cols}">${text}</td></tr>`;
}

async function loadDashboard() {
  // placeholders
  safeText(kpiEls.totalProducts, "—");
  safeText(kpiEls.totalOrders, "—");
  safeText(kpiEls.totalUsers, "—");
  safeText(kpiEls.revenue, "—");
  renderEmptyRow(lowStockTbody, 2, "Loading…");
  renderEmptyRow(newOrdersTbody, 4, "Loading…");
  if (serviceReqTbody) renderEmptyRow(serviceReqTbody, 4, "Loading…");

  try {
    // 1) Notifications
    try {
      const n = await api.get("/admin/notifications/count");
      notifBadge.textContent = `Notifications • ${n?.count ?? 0}`;
    } catch {
      // optional endpoint; ignore if not ready
      notifBadge.textContent = `Notifications • 0`;
    }

    // 2) KPI summary
    const summary = await api.get("/admin/dashboard/summary");
    safeText(kpiEls.totalProducts, summary.totalProducts);
    safeText(kpiEls.totalOrders, summary.totalOrders);
    safeText(kpiEls.totalUsers, summary.totalUsers);
    safeText(kpiEls.revenue, money(summary.revenue));

    // 3) Low stock
    const low = await api.get("/admin/dashboard/low-stock?limit=5");
    if (!Array.isArray(low) || low.length === 0) {
      renderEmptyRow(lowStockTbody, 2, "No low-stock items.");
    } else {
      lowStockTbody.innerHTML = low.map(p => `
        <tr>
          <td>${escapeHtml(p.name ?? "—")}</td>
          <td>${escapeHtml(String(p.stock ?? "—"))}</td>
        </tr>
      `).join("");
    }

    // 4) New orders
    const orders = await api.get("/admin/dashboard/new-orders?limit=5");
    if (!Array.isArray(orders) || orders.length === 0) {
      renderEmptyRow(newOrdersTbody, 4, "No recent orders.");
    } else {
      newOrdersTbody.innerHTML = orders.map(o => `
        <tr>
          <td>#${escapeHtml(String(o.id ?? o._id ?? "—"))}</td>
          <td>${escapeHtml(o.status ?? "—")}</td>
          <td>৳${escapeHtml(money(o.total))}</td>
          <td>
            ${(String(o.status||"").toLowerCase()==="pending") ? `
              <button class="btn" data-confirm-order="${encodeURIComponent(String(o.id))}">Confirm</button>
              <button class="btn danger" data-reject-order="${encodeURIComponent(String(o.id))}">Reject</button>
            ` : `<a class="btn" href="orders">Manage</a>`}
          </td>
        </tr>
      `).join("");
    }

    // 5) Service requests
    if (serviceReqTbody){
      const reqs = await api.get("/admin/service-requests");
      const list = Array.isArray(reqs) ? reqs.slice(0,5) : [];
      if (!list.length) {
        renderEmptyRow(serviceReqTbody, 4, "No service requests yet.");
      } else {
        serviceReqTbody.innerHTML = list.map(m => {
          let payload = {};
          try { payload = JSON.parse(m.message||"{}"); } catch {}
          const from = payload.name || m.name || "—";
          const svc = payload.serviceTitle || (m.subject||"").replace("Service Request:","").trim() || "—";
          const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : "—";
          return `<tr>
            <td>${escapeHtml(from)}</td>
            <td>${escapeHtml(svc)}</td>
            <td class="muted">${escapeHtml(when)}</td>
            <td><a class="btn" href="message-view.html?id=${encodeURIComponent(m.id)}">Open</a></td>
          </tr>`;
        }).join("");
      }
    }
  } catch (e) {
    // If auth fails backend may return 401 -> redirect login
    renderEmptyRow(lowStockTbody, 2, "Failed to load.");
    renderEmptyRow(newOrdersTbody, 4, "Failed to load.");
    if (serviceReqTbody) renderEmptyRow(serviceReqTbody, 4, "Failed to load.");
    console.error(e);
  }
}

// basic HTML escape to avoid breaking table
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadDashboard();

// Quick actions: confirm / reject from dashboard "New Orders" widget
newOrdersTbody?.addEventListener("click", async (e) => {
  const c = e.target.closest("[data-confirm-order]");
  const r = e.target.closest("[data-reject-order]");
  const id = c?.getAttribute("data-confirm-order") || r?.getAttribute("data-reject-order");
  if (!id) return;
  const next = c ? "confirmed" : "rejected";
  if (!confirm(c ? "Confirm this order?" : "Reject this order?")) return;
  try {
    await api.put(`/admin/orders/${encodeURIComponent(id)}/status`, { status: next });
    await loadDashboard();
  } catch (err) {
    alert(err?.message || "Failed to update order");
  }
});


async function loadLoginEvents(){
  const tbody = document.querySelector("#eventsTable tbody");
  const status = document.getElementById("eventsStatus");
  const badge = document.getElementById("eventsCount");
  if(!tbody) return;
  status.textContent = "Loading activity…";
  try{
    const events = await api.get("/admin/dashboard/login-events?limit=15");
    const list = Array.isArray(events) ? events : (events.items || []);
    badge.textContent = String(list.length);
    status.textContent = "";
    if(!list.length){
      tbody.innerHTML = '<tr><td class="muted" colspan="4">No activity yet.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(e=>{
      const t = e.createdAt ? new Date(e.createdAt).toLocaleString() : "—";
      const type = e.type || "—";
      const email = e.email || "—";
      const userId = e.userId ? String(e.userId).slice(-6) : "—";
      return `<tr><td>${t}</td><td>${type}</td><td>${email}</td><td>${userId}</td></tr>`;
    }).join("");
  }catch(err){
    status.textContent = err?.message || "Failed to load activity";
    tbody.innerHTML = '<tr><td class="muted" colspan="4">Failed to load.</td></tr>';
  }
}

loadLoginEvents();
