import { adminApi as api } from "../core/api.js";
import { requireAdmin } from "../core/auth.js";
import { bindLogout, renderUserbox, setActiveNav, refreshNotifications } from "../core/ui.js";

await requireAdmin();
setActiveNav();
bindLogout();
renderUserbox();
refreshNotifications();

const id = new URLSearchParams(location.search).get("id");

const badge = document.getElementById("orderIdBadge");
const statusVal = document.getElementById("statusVal");
const totalVal = document.getElementById("totalVal");
const createdVal = document.getElementById("createdVal");
const customerVal = document.getElementById("customerVal");
const itemsJson = document.getElementById("itemsJson");
const itemsTable = document.getElementById("itemsTable");
const paymentBox = document.getElementById("paymentBox");

const paidBtn = document.getElementById("markPaidBtn");
const shippedBtn = document.getElementById("markShippedBtn");
const confirmBtn = document.getElementById("confirmBtn");
const processingBtn = document.getElementById("processingBtn");
const deliveredBtn = document.getElementById("deliveredBtn");
const rejectBtn = document.getElementById("rejectBtn");
const statusMsg = document.getElementById("statusMsg");

function fmt(d){
  try { return new Date(d).toLocaleString(); } catch { return "—"; }
}
function money(n){
  const num = Number(n || 0);
  return `৳${num.toFixed(2)}`;
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function renderItems(items){
  if(!itemsTable) return;
  const tbody = itemsTable.querySelector("tbody");
  if(!Array.isArray(items) || !items.length){
    tbody.innerHTML = '<tr><td class="muted" colspan="4">No items</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(it=>{
    const name = it.name || it.title || it.productName || it.product?.name || "—";
    const qty = Number(it.qty ?? it.quantity ?? 1);
    const price = Number(it.price ?? it.unitPrice ?? it.product?.price ?? 0);
    const subtotal = qty * price;
    return `<tr>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(qty)}</td>
      <td>${escapeHtml(money(price))}</td>
      <td>${escapeHtml(money(subtotal))}</td>
    </tr>`;
  }).join("");
}

function renderPayment(o){
  if(!paymentBox) return;
  const pm = String(o?.paymentMethod || 'cod').toLowerCase();
  const ps = String(o?.paymentStatus || (pm==='cod' ? 'not_required' : 'unpaid')).toLowerCase();
  if(pm === 'cod'){
    paymentBox.innerHTML = `<div class="muted">Payment: COD (no proof required)</div>`;
    return;
  }
  const txn = o?.paymentTxnId ? escapeHtml(o.paymentTxnId) : '';
  const sender = o?.paymentSender ? escapeHtml(o.paymentSender) : '';
  const amt = o?.paymentAmount != null ? escapeHtml(money(o.paymentAmount)) : '';
  const note = o?.paymentReviewNote ? escapeHtml(o.paymentReviewNote) : '';
  const proof = o?.paymentProof ? String(o.paymentProof) : '';

  const showReview = (ps === 'submitted');
  paymentBox.innerHTML = `
    <div class="card" style="padding:12px; background:rgba(255,255,255,.03);">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
        <div style="font-weight:800;">Manual Payment (${escapeHtml(pm.toUpperCase())})</div>
        <span class="badge">${escapeHtml(ps)}</span>
      </div>
      <div class="muted" style="margin-top:10px;">
        ${txn ? `<div><b>TXN:</b> ${txn}</div>` : ''}
        ${sender ? `<div><b>Sender:</b> ${sender}</div>` : ''}
        ${amt ? `<div><b>Amount:</b> ${amt}</div>` : ''}
        ${note && !showReview ? `<div style="margin-top:6px;"><b>Note:</b> ${note}</div>` : ''}
      </div>
      ${proof ? `<div style="margin-top:10px;">
        <div class="muted" style="margin-bottom:8px;">Proof Screenshot</div>
        <img src="${proof}" alt="payment proof" style="width:100%; max-width:520px; border-radius:14px; border:1px solid rgba(255,255,255,.12);"/>
      </div>` : `<div class="muted" style="margin-top:10px;">No proof uploaded yet.</div>`}

      ${showReview ? `
        <div style="height:10px;"></div>
        <div class="grid two">
          <div style="grid-column:1/-1;">
            <label class="muted">Review Note (optional)</label>
            <input class="input" id="payReviewNote" placeholder="e.g., Verified. Thank you." />
          </div>
          <button class="btn primary" type="button" id="payApproveBtn">Approve Payment</button>
          <button class="btn danger" type="button" id="payRejectBtn">Reject Payment</button>
          <div class="muted" id="payReviewMsg" style="grid-column:1/-1;"></div>
        </div>
      ` : ''}
    </div>
  `;

  if(showReview){
    const approveBtn = document.getElementById('payApproveBtn');
    const rejectBtn = document.getElementById('payRejectBtn');
    const noteEl = document.getElementById('payReviewNote');
    const msgEl = document.getElementById('payReviewMsg');
    approveBtn?.addEventListener('click', async ()=>{
      msgEl.textContent = 'Approving…';
      try{
        await api.put(`/admin/orders/${encodeURIComponent(id)}/payment/approve`, { note: noteEl?.value || '' });
        msgEl.textContent = 'Approved ✅';
        load();
      }catch(e){ msgEl.textContent = e?.message || String(e); }
    });
    rejectBtn?.addEventListener('click', async ()=>{
      msgEl.textContent = 'Rejecting…';
      try{
        await api.put(`/admin/orders/${encodeURIComponent(id)}/payment/reject`, { note: noteEl?.value || '' });
        msgEl.textContent = 'Rejected ✅';
        load();
      }catch(e){ msgEl.textContent = e?.message || String(e); }
    });
  }
}

async function load(){
  if(!id){
    statusMsg.textContent = "Missing id";
    if (paidBtn) paidBtn.disabled = true;
    if (shippedBtn) shippedBtn.disabled = true;
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }
  badge.textContent = String(id).slice(-6);

  try{
    const o = await api.get(`/admin/orders/${encodeURIComponent(id)}`);

    // Enable/disable workflow actions based on current status
    const sNow = String(o?.status || "pending").toLowerCase();
    if (confirmBtn) confirmBtn.disabled = sNow !== 'pending';
    if (processingBtn) processingBtn.disabled = sNow !== 'confirmed';
    if (shippedBtn) shippedBtn.disabled = sNow !== 'processing';
    if (deliveredBtn) deliveredBtn.disabled = sNow !== 'shipped';
    // paid/reject can be used in early stages
    if (paidBtn) paidBtn.disabled = !['confirmed','processing'].includes(sNow);
    if (rejectBtn) rejectBtn.disabled = !['pending','confirmed'].includes(sNow);

    const st = String(o.status || "pending");
    statusVal.textContent = st || "—";
    totalVal.textContent = o.total != null ? money(o.total) : "—";
    createdVal.textContent = fmt(o.createdAt);

    const c = o.customer || {};
    customerVal.textContent = [
      c.name,
      c.phone,
      c.email,
      c.address,
      c.city,
      c.district,
      c.postcode,
      c.notes ? `Notes: ${c.notes}` : null
    ].filter(Boolean).join(" • ") || "—";

    const items = o.items || o.cart || [];
    renderItems(items);
    renderPayment(o);
    itemsJson.textContent = JSON.stringify(o, null, 2);

    // Action buttons: guide admin through workflow
    const disAll = (v) => {
      [confirmBtn, processingBtn, shippedBtn, deliveredBtn, rejectBtn, paidBtn].forEach(b => {
        if (b) b.disabled = !!v;
      });
    };
    disAll(false);
    // terminal statuses: no actions
    if (['delivered','cancelled','rejected','refunded'].includes(st)) {
      disAll(true);
    } else {
      // Only show valid next steps
      if (confirmBtn) confirmBtn.disabled = st !== 'pending';
      if (processingBtn) processingBtn.disabled = st !== 'confirmed' && st !== 'paid';
      if (shippedBtn) shippedBtn.disabled = st !== 'processing' && st !== 'paid';
      if (deliveredBtn) deliveredBtn.disabled = st !== 'shipped';
      if (rejectBtn) rejectBtn.disabled = st !== 'pending' && st !== 'confirmed';
    }

    statusMsg.textContent = "";
  }catch(e){
    statusMsg.textContent = e?.message || String(e);
  }
}

async function setStatus(next){
  if(!id) return;
  statusMsg.textContent = "Updating…";
  try{
    await api.put(`/admin/orders/${encodeURIComponent(id)}/status`, { status: next });
    statusMsg.textContent = `Status updated: ${next} ✅`;
    load();
  }catch(e){
    statusMsg.textContent = e?.message || String(e);
  }
}

if (paidBtn) paidBtn.addEventListener("click", ()=> setStatus("paid"));
if (shippedBtn) shippedBtn.addEventListener("click", ()=> setStatus("shipped"));
if (processingBtn) processingBtn.addEventListener("click", ()=> setStatus("processing"));
if (deliveredBtn) deliveredBtn.addEventListener("click", ()=> setStatus("delivered"));
if (confirmBtn) confirmBtn.addEventListener("click", ()=> setStatus("confirmed"));
if (rejectBtn) rejectBtn.addEventListener("click", ()=> setStatus("rejected"));

load();
