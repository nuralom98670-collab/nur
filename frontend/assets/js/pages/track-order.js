import "../core/site-ui.js";
import { getCartCount } from "../core/cart.js";

const cartCountEl = document.getElementById("cartCount");
if (cartCountEl) cartCountEl.textContent = String(getCartCount());
document.getElementById("year").textContent = String(new Date().getFullYear());

const form = document.getElementById("trackForm");
const statusEl = document.getElementById("status");
const orderIdEl = document.getElementById("orderId");
const tokenEl = document.getElementById("orderToken");
const viewEl = document.getElementById("orderView");
const statusBadge = document.getElementById("statusBadge");

function money(n){
  const v = Number(n||0);
  return isFinite(v) ? `৳${v.toFixed(0)}` : "—";
}

function badgeText(s){
  const map = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    paid: "Paid",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    rejected: "Rejected",
    refunded: "Refunded",
  };
  return map[String(s||"pending")] || String(s||"pending");
}

function render(order){
  if(!order){
    viewEl.innerHTML = `<div class="muted">No data.</div>`;
    statusBadge.textContent = "—";
    return;
  }
  statusBadge.textContent = badgeText(order.status);
  const created = order?.createdAt ? new Date(order.createdAt).toLocaleString() : "";
  const c = order?.customer || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const events = Array.isArray(order?.events) ? order.events : [];

  const itemsHtml = items.length ? `<ul style="margin:10px 0 0 18px;">${items.map(it=>{
      const nm = it?.name || it?.title || 'Item';
      const q = Number(it?.qty || it?.quantity || 1);
      const pr = money(it?.price || it?.unitPrice || 0);
      return `<li style="margin:4px 0;"><b>${nm}</b> — ${q} × ${pr}</li>`;
    }).join('')}</ul>` : `<div class="muted">No items</div>`;

  const timeline = events.length ? `
    <div style="margin-top:12px;">
      <div style="font-weight:800; margin-bottom:8px;">Timeline</div>
      <div style="display:grid; gap:8px;">
        ${events.map(e=>{
          const when = e?.createdAt ? new Date(e.createdAt).toLocaleString() : '';
          return `<div class="card" style="padding:10px; background:rgba(255,255,255,.03);">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div><b>${badgeText(e?.status)}</b> <span class="muted">(${String(e?.actor||'')})</span></div>
              <div class="muted">${when}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  viewEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
      <div>
        <div style="font-weight:800;">Order #${order.id}</div>
        <div class="muted">${created}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:800;">Total: ${money(order.total)}</div>
        <div class="muted">Shipping: ${money(order.shipping)}</div>
      </div>
    </div>
    <div class="hr" style="margin:12px 0;"></div>
    <div class="muted">
      ${c?.name ? `<div><b>Name:</b> ${c.name}</div>` : ''}
      ${c?.email ? `<div><b>Email:</b> ${c.email}</div>` : ''}
      ${c?.phone ? `<div><b>Phone:</b> ${c.phone}</div>` : ''}
      ${c?.address ? `<div><b>Address:</b> ${c.address}</div>` : ''}
    </div>
    <div class="hr" style="margin:12px 0;"></div>
    <div><b>Items</b>${itemsHtml}</div>
    ${timeline}
  `;
}

async function fetchOrder(id, token){
  const r = await fetch(`/api/public/orders/${encodeURIComponent(id)}/track?token=${encodeURIComponent(token)}`, {
    credentials: 'include'
  });
  if(!r.ok){
    const j = await r.json().catch(()=>({}));
    throw new Error(j?.error || 'Failed to fetch order');
  }
  return r.json();
}

function prefillFromUrlOrLocal(){
  const qp = new URLSearchParams(location.search||'');
  const id = qp.get('id') || '';
  const token = qp.get('token') || '';
  if (id) orderIdEl.value = id;
  if (token) tokenEl.value = token;

  // If only id is provided, try localStorage map
  if (id && !token) {
    try {
      const map = JSON.parse(localStorage.getItem('guestOrderTokens')||'{}');
      if (map[id]) tokenEl.value = map[id];
    } catch {}
  }
}

prefillFromUrlOrLocal();

let pollTimer = null;
async function doTrack(){
  const id = String(orderIdEl.value||'').trim();
  const token = String(tokenEl.value||'').trim();
  if(!id || !token) return;

  try {
    statusEl.textContent = 'Loading...';
    const order = await fetchOrder(id, token);
    render(order);
    statusEl.textContent = 'Live tracking on ✅';
  } catch (e) {
    statusEl.textContent = e?.message || 'Failed';
    render(null);
    return;
  }

  // Poll every 12 seconds for live updates
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async ()=>{
    try {
      const order = await fetchOrder(id, token);
      render(order);
    } catch {}
  }, 12000);
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  doTrack();
});

// Auto-track if prefilled
if (String(orderIdEl.value||'') && String(tokenEl.value||'')) {
  doTrack();
}
