import "../core/site-ui.js";
import { api } from "../core/api.js";
import { CONFIG } from "../core/config.js";
import { getCartCount, getCart, setCart } from "../core/cart.js";
import { getToken, getCurrentUser, logout } from "../core/auth.js";

const cartCount = document.getElementById("cartCount");
cartCount.textContent = String(getCartCount());
document.getElementById("year").textContent = String(new Date().getFullYear());

const authGate = document.getElementById("authGate");
const dashContent = document.getElementById("dashContent");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const notifBtn = document.getElementById("notifBtn");
const notifCount = document.getElementById("notifCount");

const userEmail = document.getElementById("userEmail");
const userBadge = document.getElementById("userBadge");
const userSince = document.getElementById("userSince");
const helloName = document.getElementById("helloName");

const statOrders = document.getElementById("statOrders");
const statPending = document.getElementById("statPending");
const statWishlist = document.getElementById("statWishlist");

const recentOrders = document.getElementById("recentOrders");
const ordersTable = document.getElementById("ordersTable");
const wishlistGrid = document.getElementById("wishlistGrid");
const reviewsList = document.getElementById("reviewsList");

const overviewStatus = document.getElementById("overviewStatus");
const ordersStatus = document.getElementById("ordersStatus");
const wishlistStatus = document.getElementById("wishlistStatus");
const reviewsStatus = document.getElementById("reviewsStatus");

// Notifications
const notificationsList = document.getElementById("notificationsList");
const markAllReadBtn = document.getElementById("markAllReadBtn");
const notifStatus = document.getElementById("notifStatus");

const reviewForm = document.getElementById("reviewForm");
const reviewProductSelect = document.getElementById("reviewProductSelect");
const reviewRating = document.getElementById("reviewRating");
const reviewBody = document.getElementById("reviewBody");
const reviewFormStatus = document.getElementById("reviewFormStatus");

const profileForm = document.getElementById("profileForm");
const profileNameInput = document.getElementById("profileNameInput");
const profileEmailInput = document.getElementById("profileEmailInput");
const profilePhoneInput = document.getElementById("profilePhoneInput");
const profileAddressInput = document.getElementById("profileAddressInput");
const profileStatus = document.getElementById("profileStatus");
// Tabs
const sideLinks = Array.from(document.querySelectorAll(".side-link"));
const panes = Array.from(document.querySelectorAll(".tab-pane"));

// Public UI config (payment numbers / instructions)
let SITE = { bkashNumber:"", nagadNumber:"", rocketNumber:"", paymentInstructions:"" };

function openTab(tab) {
  sideLinks.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  panes.forEach(p => p.style.display = (p.dataset.pane === tab) ? "" : "none");
  // scroll main a bit to top
  document.querySelector(".dash-main")?.scrollTo?.(0,0);
}

sideLinks.forEach(btn => btn.addEventListener("click", () => openTab(btn.dataset.tab)));
document.querySelectorAll("[data-open]").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    openTab(a.dataset.open);
  });
});

logoutBtn.addEventListener("click", () => logout());

// Profile update
reviewForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    reviewFormStatus.textContent = "Submitting...";
    const productId = reviewProductSelect?.value || "";
    if (!productId) throw new Error("Please select a product");
    const rating = Number(reviewRating?.value || 5);
    const body = reviewBody?.value || "";
    const created = await api.post("/account/reviews", { productId, rating, body });
    reviewBody.value = "";
    const st = created?.status || "pending";
    reviewFormStatus.textContent = (st === 'approved') ? "Submitted ✅" : "Submitted ✅ (Pending approval)";
    // Refresh list
    const rev = await api.get("/account/reviews").catch(() => []);
    const revItems = Array.isArray(rev) ? rev : (rev?.items || []);
    renderReviews(revItems);
  } catch (err) {
    reviewFormStatus.textContent = err?.message || "Failed";
  }
});

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    profileStatus.textContent = "Saving...";
    const payload = {
      name: profileNameInput?.value || "",
      phone: profilePhoneInput?.value || "",
      address: profileAddressInput?.value || ""
    };
    const updated = await api.put("/auth/me", payload);
    profileStatus.textContent = "Saved ✅";
    // Update header greeting
    helloName.textContent = (updated?.name || "Customer").split(" ")[0];
  } catch (err) {
    profileStatus.textContent = err?.message || "Failed to save";
  }
});


// Helpers
function money(n) {
  const v = Number(n || 0);
  return isFinite(v) ? `৳${v.toFixed(0)}` : "—";
}

function esc(str){
  return String(str ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function paymentStatusPill(s){
  const k = String(s || '').toLowerCase();
  const map = {
    not_required: 'Not required',
    unpaid: 'Unpaid',
    submitted: 'Submitted',
    verified: 'Verified',
    rejected: 'Rejected'
  };
  const label = map[k] || (k || 'Unpaid');
  const opacity = (k === 'verified') ? '' : 'opacity:.9;'
  return `<span class="badge" style="${opacity}">Payment: ${esc(label)}</span>`;
}

function paymentHint(provider){
  const p = String(provider || '').toLowerCase();
  const num = (p === 'bkash' ? SITE.bkashNumber : (p === 'nagad' ? SITE.nagadNumber : (p === 'rocket' ? SITE.rocketNumber : '')));
  const base = num ? `${p.toUpperCase()} Number: ${num}.` : `${p.toUpperCase()} selected.`;
  const extra = SITE.paymentInstructions ? ` ${SITE.paymentInstructions}` : ' Send money and then submit Transaction ID + screenshot below.';
  return base + extra;
}

function renderPaymentBlock(o, idx){
  const pm = String(o?.paymentMethod || 'cod').toLowerCase();
  if(pm === 'cod') return '';
  const ps = String(o?.paymentStatus || 'unpaid').toLowerCase();
  const orderId = o?.id || '';
  const blockId = `payBlock_${orderId}_${idx}`;
  const stId = `payStatus_${orderId}_${idx}`;
  const canSubmit = (ps === 'unpaid' || ps === 'rejected');
  const note = (ps === 'rejected' && o?.paymentReviewNote) ? `<div class="muted" style="margin-top:8px;">Admin note: ${esc(o.paymentReviewNote)}</div>` : '';
  return `
    <div class="card" style="padding:12px; margin-top:12px; background:rgba(255,255,255,.03);">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
        <div style="font-weight:800;">Manual Payment</div>
        ${paymentStatusPill(ps)}
      </div>
      <div class="muted" style="margin-top:8px;">${esc(paymentHint(pm))}</div>
      ${note}
      ${canSubmit ? `
        <div style="height:10px;"></div>
        <form data-payform="${esc(blockId)}" class="grid two">
          <div>
            <label class="muted">Transaction ID</label>
            <input class="input" name="txnId" required placeholder="e.g., 8H7K..." />
          </div>
          <div>
            <label class="muted">Sender Number (optional)</label>
            <input class="input" name="sender" placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label class="muted">Amount (optional)</label>
            <input class="input" name="amount" type="number" min="0" step="1" placeholder="${esc(String(Number(o?.total||0).toFixed(0)))}" />
          </div>
          <div>
            <label class="muted">Screenshot (required)</label>
            <input class="input" name="proof" type="file" accept="image/*" required />
          </div>
          <div style="grid-column:1/-1; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <button class="btn" type="submit">Submit Payment Proof</button>
            <span class="muted" id="${esc(stId)}"></span>
          </div>
        </form>
      ` : `
        <div style="height:10px;"></div>
        <div class="muted">${ps === 'submitted' ? 'Payment submitted — waiting for admin verification.' : (ps === 'verified' ? 'Payment verified ✅' : '')}</div>
      `}
    </div>
  `;
}

function statusPill(status) {
  const s = String(status || "pending");
  const map = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    paid: "Paid",
    shipped: "Shipped",
    delivered: "Delivered",
    rejected: "Rejected",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  const label = map[s] || s;
  return `<span class="badge">${label}</span>`;
}

function statusIndex(status){
  const s = String(status || 'pending');
  const order = ['pending','confirmed','processing','shipped','delivered'];
  const idx = order.indexOf(s);
  return idx === -1 ? 0 : idx;
}

function getPurchasedProducts(orders){
  const map = new Map();
  (orders||[]).forEach(o=>{
    (Array.isArray(o?.items)? o.items: []).forEach(it=>{
      const pid = it?.productId || it?.id || "";
      const name = it?.name || it?.title || "";
      if (!pid) return;
      if (!map.has(pid)) map.set(pid, { productId: pid, name: name || pid });
    });
  });
  return Array.from(map.values());
}

function renderStepper(status){
  const steps = [
    { key:'pending', label:'Order Received' },
    { key:'confirmed', label:'Confirmed' },
    { key:'processing', label:'Processing' },
    { key:'shipped', label:'Shipped' },
    { key:'delivered', label:'Delivered' },
  ];
  const idx = statusIndex(status);
  return `
    <div class="stepper" style="margin-top:12px;">
      ${steps.map((s,i)=>`<div class="step" style="flex:1; min-width:120px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge" style="${i<=idx?'':'opacity:.5'}">${i+1}</span>
          <span class="muted" style="font-size:13px; ${i<=idx?'':'opacity:.6'}">${s.label}</span>
        </div>
        <div style="height:6px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; margin-top:8px;">
          <div style="height:100%; width:${i<idx?100:(i===idx?60:0)}%; background:rgba(255,255,255,.6);"></div>
        </div>
      </div>`).join('')}
    </div>
  `;
}

function renderEvents(o){
  const events = Array.isArray(o?.events) ? o.events : [];
  if(!events.length) return "";
  const label = (s) => {
    const m = {
      pending: 'Order Received',
      confirmed: 'Confirmed',
      processing: 'Processing',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
      refunded: 'Refunded'
    };
    const k = String(s||'pending');
    return m[k] || k;
  };
  return `
    <div style="margin-top:12px;">
      <div style="font-weight:800; margin-bottom:8px;">Timeline</div>
      <div style="display:grid; gap:8px;">
        ${events.map(e=>{
          const when = e?.createdAt ? new Date(e.createdAt).toLocaleString() : '';
          const who = e?.actor ? String(e.actor) : '';
          const note = e?.note ? String(e.note) : '';
          return `<div class="card" style="padding:10px; background:rgba(255,255,255,.03);">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div><b>${label(e?.status)}</b>${who ? ` <span class="muted">(${who})</span>` : ''}</div>
              <div class="muted">${when}</div>
            </div>
            ${note ? `<div class="muted" style="margin-top:6px;">${note}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderOrdersList(targetEl, orders, limit = null) {
  if (!orders?.length) {
    targetEl.innerHTML = `<div class="muted">No orders yet.</div>`;
    return;
  }
  const list = (limit ? orders.slice(0, limit) : orders);
  const rows = list.map((o, idx) => {
    const id = o?.id ?? "";
    const created = o?.createdAt ? new Date(o.createdAt).toLocaleString() : "";
    const total = money(o?.total ?? o?.grandTotal ?? o?.amount);
    const items = Array.isArray(o?.items) ? o.items : [];
    const itemsHtml = items.length
      ? `<ul style="margin:10px 0 0 18px;">${
          items.map(it => {
            const nm = it?.name || it?.title || `Item`;
            const q = Number(it?.qty || it?.quantity || 1);
            const pr = money(it?.price || it?.unitPrice || 0);
            return `<li style="margin:4px 0;"><span style="font-weight:700;">${nm}</span> — ${q} × ${pr}</li>`;
          }).join("")
        }</ul>`
      : `<div class="muted" style="margin-top:10px;">No items found for this order.</div>`;

    const ship = (o?.shipping != null) ? money(o.shipping) : "";
    const pay = o?.paymentMethod ? String(o.paymentMethod).toUpperCase() : "";
    const customer = o?.customer || {};
    const custLine = (customer?.name || customer?.email || customer?.phone)
      ? `<div class="muted" style="margin-top:8px;">
          ${customer?.name ? `<div><b>Name:</b> ${customer.name}</div>` : ""}
          ${customer?.email ? `<div><b>Email:</b> ${customer.email}</div>` : ""}
          ${customer?.phone ? `<div><b>Phone:</b> ${customer.phone}</div>` : ""}
          ${customer?.address ? `<div><b>Address:</b> ${customer.address}</div>` : ""}
        </div>` : "";

    const detailsId = `orderDetails_${id}_${idx}`;
    return `
      <div class="card" style="padding:14px; margin:10px 0;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;">Order #${id}</div>
            <div class="muted" style="margin-top:4px;">${created}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            ${statusPill(o?.status)}
            <div style="font-weight:800;">${total}</div>
          </div>
        </div>
        ${renderStepper(o?.status)}
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button class="btn btn-sm" type="button" data-toggle="${detailsId}">Details</button>
          ${pay ? `<span class="muted"><b>Pay:</b> ${pay}</span>` : ""}
          ${ship ? `<span class="muted"><b>Shipping:</b> ${ship}</span>` : ""}
        </div>
        <div id="${detailsId}" style="display:none; margin-top:10px;">
          ${renderPaymentBlock(o, idx)}
          ${itemsHtml}
          ${custLine}
          ${renderEvents(o)}
        </div>
      </div>
    `;
  }).join("");
  targetEl.innerHTML = rows;

  // Wire toggles
  targetEl.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle");
      const box = document.getElementById(id);
      const open = box && box.style.display !== "none";
      if (box) box.style.display = open ? "none" : "";
      btn.textContent = open ? "Details" : "Hide details";
    });
  });

  // Manual payment proof submit
  targetEl.querySelectorAll("form[data-payform]").forEach(formEl => {
    formEl.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const orderId = String(formEl.closest('.card')?.querySelector('div[style*="Order #"]')?.textContent || '').replace('Order #','').trim();
      // Fallback: parse from payform id attribute
      const payId = formEl.getAttribute('data-payform') || '';
      const match = payId.match(/payBlock_(ord_[^_]+_[^_]+)_(\d+)/);
      const id = match ? match[1] : '';
      const stEl = formEl.querySelector('#' + payId.replace('payBlock','payStatus')) || document.getElementById(payId.replace('payBlock','payStatus'));
      const statusOut = stEl || formEl.querySelector('.muted');
      const txnId = formEl.querySelector('[name="txnId"]')?.value || '';
      const sender = formEl.querySelector('[name="sender"]')?.value || '';
      const amount = formEl.querySelector('[name="amount"]')?.value || '';
      const file = formEl.querySelector('[name="proof"]')?.files?.[0];
      if(!file){ if(statusOut) statusOut.textContent='Please choose an image.'; return; }
      if(file.size > 6 * 1024 * 1024){ if(statusOut) statusOut.textContent='Image too large (max ~6MB).'; return; }
      if(statusOut) statusOut.textContent = 'Uploading…';
      try{
        const dataUrl = await new Promise((resolve, reject)=>{
          const r = new FileReader();
          r.onload = ()=> resolve(String(r.result||''));
          r.onerror = ()=> reject(new Error('read'));
          r.readAsDataURL(file);
        });
        await api.post(`/account/orders/${encodeURIComponent(id)}/payment-proof`, {
          provider: null,
          txnId,
          sender,
          amount: amount ? Number(amount) : null,
          proofDataUrl: dataUrl
        });
        if(statusOut) statusOut.textContent = 'Submitted ✅ Waiting for admin verification.';
        // Refresh orders (so Payment status updates)
        const orders = await api.get('/account/orders').catch(()=>[]);
        renderOrdersList(ordersTable, orders);
        renderOrdersList(recentOrders, orders, 3);
      }catch(err){
        if(statusOut) statusOut.textContent = err?.message || 'Failed to submit payment';
      }
    });
  });
}


function renderWishlist(items) {
  if (!items?.length) {
    wishlistGrid.innerHTML = `<div class="muted">No wishlist items yet.</div>`;
    return;
  }
  wishlistGrid.innerHTML = items.map(p => {
    const img = p?.image || p?.cover || (Array.isArray(p?.images) ? p.images[0] : "");
    const title = p?.title || p?.name || "Item";
    const price = money(p?.price);
    return `
      <div class="card" style="padding:0;">
        <a class="linkcard" href="./product?id=${encodeURIComponent(p?.id)}" style="display:block; padding:16px;">
        <div class="thumb" style="height:160px; overflow:hidden; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04);">
          ${img ? `<img src="${img}" alt="" style="width:100%; height:100%; object-fit:cover;">` : `<div style="height:100%; display:flex; align-items:center; justify-content:center;" class="muted">No image</div>`}
        </div>
        <div style="margin-top:10px; font-weight:800;">${title}</div>
        <div class="muted">${price}</div>
      </a>
        <div style="padding:0 16px 16px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn" data-addcart="${encodeURIComponent(p?.id)}" style="padding:8px 10px;">Add to cart</button>
          <button class="btn" data-unwish="${encodeURIComponent(p?.id)}" style="padding:8px 10px; opacity:.85;">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  // Add to cart
  wishlistGrid.querySelectorAll("[data-addcart]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = decodeURIComponent(btn.getAttribute("data-addcart") || "");
      if(!id) return;
      // Find product data from current wishlist items
      const p = (items || []).find(x => String(x?.id) === String(id));
      if(!p) return;
      const cart = getCart();
      const existing = cart.find(x => String(x?.id) === String(id));
      if (existing) existing.qty = Number(existing.qty || 1) + 1;
      else cart.push({ id: p.id, name: p.name || p.title || "Item", price: Number(p.price||0), qty: 1, image: p.image || p.cover || (Array.isArray(p.images)?p.images[0]:"") });
      setCart(cart);
      cartCount.textContent = String(getCartCount());
      btn.textContent = "Added ✅";
      setTimeout(()=>{ btn.textContent = "Add to cart"; }, 900);
    });
  });

  wishlistGrid.querySelectorAll("[data-unwish]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = decodeURIComponent(btn.getAttribute("data-unwish") || "");
      if(!id) return;
      try{
        await api.post("/account/wishlist/remove", { productId: id });
        // refresh
        const items = await api.get("/account/wishlist");
        statWishlist.textContent = String(items?.length || 0);
        renderWishlist(items);
      }catch{}
    });
  });
}

function renderReviews(items) {
  if (!items?.length) {
    reviewsList.innerHTML = `<div class="muted">No reviews yet.</div>`;
    return;
  }
  reviewsList.innerHTML = items.map(r => {
    const rating = Math.max(1, Math.min(5, Number(r?.rating || 0)));
    const stars = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
    const title = r?.productTitle || r?.productName || `Product #${r?.productId ?? ""}`;
    const body = r?.body || r?.comment || "";
    const when = r?.createdAt ? new Date(r.createdAt).toLocaleString() : "";
    const st = String(r?.status || 'pending');
    const stBadge = st ? `<span class="badge" style="margin-left:8px; opacity:.85;">${st}</span>` : "";
    return `
      <div class="card" style="padding:14px; margin:10px 0;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div style="font-weight:800;">${title}${stBadge}</div>
          <div class="muted">${stars}</div>
        </div>
        ${when ? `<div class="muted" style="margin-top:6px;">${when}</div>` : ""}
        <div class="muted" style="margin-top:8px;">${body}</div>
      </div>
    `;
  }).join("");
}

function renderNotifications(items){
  if(!notificationsList) return;
  if(!items?.length){
    notificationsList.innerHTML = `<div class="muted">No notifications yet.</div>`;
    return;
  }
  notificationsList.innerHTML = items.map(n => {
    const when = n?.createdAt ? new Date(n.createdAt).toLocaleString() : "";
    const title = n?.title || "Notification";
    const body = n?.body || "";
    const unread = Number(n?.isRead||0) ? "" : "style=\"border:1px solid rgba(255,255,255,.25)\"";
    return `
      <div class="card" ${unread} style="padding:14px; margin:10px 0;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div style="font-weight:800;">${title}</div>
          <div class="muted">${when}</div>
        </div>
        ${body ? `<div class="muted" style="margin-top:8px;">${body}</div>` : ""}
      </div>
    `;
  }).join("");
}


async function boot() {
  // Safety: never show dashboard content until auth is verified.
  try { dashContent.style.display = "none"; } catch {}

  // Load public config (payment numbers / instructions)
  try{
    const r = await fetch('/api/public/site-config');
    if(r.ok){
      const j = await r.json();
      SITE = { ...SITE, ...j };
    }
  }catch{}

  // We support BOTH localStorage token and httpOnly cookie session.
  // So instead of checking only token, we directly ask the server who is logged in.
  try {
    const me = await getCurrentUser();

    // Logged in
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    if (notifBtn) notifBtn.style.display = "";
    authGate.style.display = "none";
    dashContent.style.display = "";
    const name = me?.name || me?.fullName || me?.username || "Friend";
    helloName.textContent = `Hello, ${name} 👋`;
    userEmail.textContent = me?.email || "—";
    userBadge.textContent = "Member";
    userBadge.style.display = "";
    userSince.style.display = "";
    if (profileNameInput) profileNameInput.value = name;
if (profileEmailInput) profileEmailInput.value = me?.email || "";
if (profilePhoneInput) profilePhoneInput.value = me?.phone || "";
if (profileAddressInput) profileAddressInput.value = me?.address || "";


    // Orders
    const orders = await api.get("/account/orders").catch(() => []);
    const all = Array.isArray(orders) ? orders : (orders?.items || []);
    statOrders.textContent = String(all.length);
    statPending.textContent = String(all.filter(o => String(o?.status || "pending") === "pending").length);
    renderOrdersList(recentOrders, all, 5);
    renderOrdersList(ordersTable, all, null);

    // Populate "Write a review" products from purchased items
    const purchased = getPurchasedProducts(all);
    if (reviewProductSelect) {
      if (!purchased.length) {
        reviewProductSelect.innerHTML = `<option value="">No purchased products yet</option>`;
        reviewProductSelect.disabled = true;
      } else {
        reviewProductSelect.disabled = false;
        reviewProductSelect.innerHTML = purchased.map(p => `<option value="${p.productId}">${p.name}</option>`).join("");
      }
    }

    // Wishlist
    const wl = await api.get("/account/wishlist").catch(() => []);
    const wlItems = Array.isArray(wl) ? wl : (wl?.items || []);
    statWishlist.textContent = String(wlItems.length);
    renderWishlist(wlItems);

    // Reviews (optional)
    const rev = await api.get("/account/reviews").catch(() => []);
    const revItems = Array.isArray(rev) ? rev : (rev?.items || []);
    renderReviews(revItems);

    // Notifications
    try {
      const uc = await api.get("/account/notifications/unread-count");
      const c = Number(uc?.count||0);
      if (notifCount) notifCount.textContent = String(c);
      const nts = await api.get("/account/notifications?limit=30").catch(() => []);
      const ntItems = Array.isArray(nts) ? nts : (nts?.items || []);
      renderNotifications(ntItems);
      // Mark all read button
      markAllReadBtn?.addEventListener("click", async () => {
        try {
          notifStatus.textContent = "Marking...";
          await api.post("/account/notifications/mark-read", {});
          notifStatus.textContent = "All read ✅";
          if (notifCount) notifCount.textContent = "0";
          const nts2 = await api.get("/account/notifications?limit=30").catch(() => []);
          renderNotifications(Array.isArray(nts2) ? nts2 : (nts2?.items || []));
        } catch {
          notifStatus.textContent = "Failed";
        }
      }, { once: true });
    } catch {}

    // Live updates: poll orders + notification count so status changes from admin
    // (confirmed/processing/shipped/delivered) appear automatically.
    let lastOrdersSig = JSON.stringify(all.map(o=>({id:o.id,status:o.status,updatedAt:o.updatedAt})));
    let liveTimer = null;
    const refreshLive = async () => {
      try {
        const ord = await api.get("/account/orders").catch(() => []);
        const next = Array.isArray(ord) ? ord : (ord?.items || []);
        const sig = JSON.stringify(next.map(o=>({id:o.id,status:o.status,updatedAt:o.updatedAt})));
        if (sig !== lastOrdersSig) {
          lastOrdersSig = sig;
          statOrders.textContent = String(next.length);
          statPending.textContent = String(next.filter(o => String(o?.status || "pending") === "pending").length);
          renderOrdersList(recentOrders, next, 5);
          renderOrdersList(ordersTable, next, null);
          // refresh purchased dropdown (in case delivered happens)
          const purchased2 = getPurchasedProducts(next);
          if (reviewProductSelect) {
            if (!purchased2.length) {
              reviewProductSelect.innerHTML = `<option value="">No purchased products yet</option>`;
              reviewProductSelect.disabled = true;
            } else {
              reviewProductSelect.disabled = false;
              reviewProductSelect.innerHTML = purchased2.map(p => `<option value="${p.productId}">${p.name}</option>`).join("");
            }
          }
        }
        const uc2 = await api.get("/account/notifications/unread-count").catch(()=>({count:0}));
        const c2 = Number(uc2?.count||0);
        if (notifCount) notifCount.textContent = String(c2);
      } catch {}
    };

    // Start polling
    liveTimer = setInterval(refreshLive, 12000);
    // Also refresh when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshLive();
    });

    overviewStatus.textContent = "";
    ordersStatus.textContent = "";
    wishlistStatus.textContent = "";
    reviewsStatus.textContent = "";

  } catch (e) {
    // Logged out -> hard redirect (no guest dashboard access)
    try {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `/login?next=${next}`;
    } catch {
      location.href = "/login";
    }
    return;
  }

  // If this page wants a default tab (separate dashboard pages), open it.
  const preferred = document.body?.dataset?.defaultTab;
  const qp = new URLSearchParams(location.search || "");
  const t = qp.get("tab") || preferred;
  if (t) openTab(t);
}

boot();

