// /assets/js/pages/checkout.js
import "../core/site-ui.js";
import { getToken, getCurrentUser } from "../core/auth.js";
import { CONFIG } from "../core/config.js";
const yearEl = document.getElementById("year");
yearEl.textContent = String(new Date().getFullYear());

const cartCountEl = document.getElementById("cartCount");
const summaryList = document.getElementById("summaryList");

const sumSubtotal = document.getElementById("sumSubtotal");
const sumShipping = document.getElementById("sumShipping");
const sumTotal = document.getElementById("sumTotal");
const discountRow = document.getElementById("discountRow");
const sumDiscount = document.getElementById("sumDiscount");

const form = document.getElementById("checkoutForm");
const statusEl = document.getElementById("status");
const deliveryAreaEl = document.getElementById("deliveryArea");
const paymentMethodEl = document.getElementById("paymentMethod");
const paymentHintEl = document.getElementById("paymentHint");
const manualPaymentBox = document.getElementById("manualPaymentBox");
const manualPaymentInstr = document.getElementById("manualPaymentInstr");
const paymentTxnIdEl = document.getElementById("paymentTxnId");
const paymentSenderEl = document.getElementById("paymentSender");
const paymentProofEl = document.getElementById("paymentProof");

let CFG = { currency: "৳", deliveryDhaka: 100, deliveryOutside: 150, paymentMethods: ["cod","bkash","nagad","rocket"], bkashNumber:"", nagadNumber:"", rocketNumber:"", paymentInstructions:"" };

let appliedCoupon = { code: "", discount: 0, valid: false };

function getCart(){ try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } }
function setCart(cart){
  localStorage.setItem("cart", JSON.stringify(cart));
  cartCountEl.textContent = String(cart.reduce((s,x)=>s+Number(x.qty||1),0));
}
setCart(getCart());

function formatMoney(n){ return `${CFG.currency}${Number(n||0).toFixed(2)}`; }
function calcShipping(subtotal){
  if(subtotal <= 0) return 0;
  const area = (deliveryAreaEl?.value || "dhaka");
  return area === "outside" ? Number(CFG.deliveryOutside) : Number(CFG.deliveryDhaka);
}

async function prefillFromProfile(){
  // If user is logged in, prefill checkout fields from profile.
  const token = getToken() || localStorage.getItem(CONFIG.TOKEN_KEY);
  if(!token) return;
  try{
    const me = await getCurrentUser();
    const byName = (name) => form?.querySelector(`[name="${name}"]`);
    const setVal = (name, val) => {
      const el = byName(name);
      if(el && !el.value && val) el.value = String(val);
    };
    setVal("name", me?.name);
    setVal("email", me?.email);
    setVal("phone", me?.phone);
    setVal("address", me?.address);
  } catch {
    // ignore
  }
}

async function loadConfig(){
  try{
    const r = await fetch("/api/public/site-config");
    if(!r.ok) throw new Error("config");
    const c = await r.json();
    CFG = {...CFG, ...c};
    // Update payment methods dropdown
    if(paymentMethodEl && Array.isArray(CFG.paymentMethods)){
      const labels = {
        cod: "Cash on Delivery",
        bkash: "bKash",
        nagad: "Nagad",
        rocket: "Rocket"
      };
      paymentMethodEl.innerHTML = CFG.paymentMethods.map(m => `<option value="${m}">${labels[m] || m}</option>`).join("");
    }
  }catch{}
}

function renderSummary(){
  const cart=getCart();
  if(!cart.length){
    summaryList.innerHTML = `<div class="muted">Cart is empty.</div>`;
    return;
  }
  summaryList.innerHTML = cart.map(i => `
    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
      <div>${i.name} × ${i.qty}</div>
      <div>${formatMoney(i.qty * i.price)}</div>
    </div>
  `).join("");

  const subtotal = cart.reduce((s,x)=>s + x.qty*x.price,0);
  const shipping = calcShipping(subtotal);
  const discount = appliedCoupon.valid ? Number(appliedCoupon.discount||0) : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  sumSubtotal.textContent = formatMoney(subtotal);
  sumShipping.textContent = formatMoney(shipping);
  if(discountRow && sumDiscount){
    if(discount > 0){
      discountRow.style.display = "flex";
      sumDiscount.textContent = `-${formatMoney(discount)}`;
    } else {
      discountRow.style.display = "none";
      sumDiscount.textContent = `-${formatMoney(0)}`;
    }
  }
  sumTotal.textContent = formatMoney(total);
}

await loadConfig();
await prefillFromProfile();
renderSummary();

// Coupon apply (optional)
const couponInput = form?.querySelector('[name="coupon"]');
let couponTimer = null;
async function validateCoupon(){
  if(!couponInput) return;
  const code = String(couponInput.value||"").trim();
  const cart = getCart();
  const subtotal = cart.reduce((s,x)=>s + Number(x.qty||1)*Number(x.price||0),0);
  if(!code){
    appliedCoupon = { code:"", discount:0, valid:false };
    renderSummary();
    return;
  }
  try{
    const r = await fetch(`/api/public/coupons/validate?code=${encodeURIComponent(code)}&subtotal=${encodeURIComponent(subtotal)}`);
    const j = await r.json().catch(()=>null);
    if(j?.valid){
      appliedCoupon = { code: j.code || code, discount: Number(j.discount||0), valid: true };
      statusEl.textContent = `Coupon applied ✅ (${appliedCoupon.code})`;
    } else {
      appliedCoupon = { code, discount:0, valid:false };
      statusEl.textContent = j?.reason ? `Coupon invalid: ${j.reason}` : "Coupon invalid";
    }
    renderSummary();
  } catch {
    appliedCoupon = { code, discount:0, valid:false };
    renderSummary();
  }
}

couponInput?.addEventListener('input', ()=>{
  if(couponTimer) clearTimeout(couponTimer);
  couponTimer = setTimeout(()=>{ validateCoupon(); }, 450);
});

deliveryAreaEl?.addEventListener("change", renderSummary);
paymentMethodEl?.addEventListener("change", ()=>{
  const m = paymentMethodEl.value;
  if(!paymentHintEl) return;
  if(m === "cod") {
    paymentHintEl.textContent = "Pay when you receive the product.";
    if (manualPaymentBox) manualPaymentBox.style.display = "none";
    return;
  }
  const num = (m === 'bkash' ? CFG.bkashNumber : (m === 'nagad' ? CFG.nagadNumber : (m === 'rocket' ? CFG.rocketNumber : '')));
  const base = num ? `${m.toUpperCase()} Number: ${num}.` : `${m.toUpperCase()} payment selected.`;
  const extra = CFG.paymentInstructions ? ` ${CFG.paymentInstructions}` : " Please pay first, then submit Transaction ID + screenshot to place the order.";
  paymentHintEl.textContent = base + extra;
  if (manualPaymentBox) manualPaymentBox.style.display = "block";
  if (manualPaymentInstr) {
    manualPaymentInstr.textContent = base + extra;
  }
});

// Initial hint
try { paymentMethodEl?.dispatchEvent(new Event('change')); } catch {}

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const cart=getCart();
  if(!cart.length){ statusEl.textContent="Cart is empty."; return; }

  const data = Object.fromEntries(new FormData(form).entries());

  // Guest checkout is allowed.
  // For guests we require email so they can track their order.
  const token = getToken() || localStorage.getItem(CONFIG.TOKEN_KEY) || "";
  if (!token && !String(data.email || "").trim()) {
    statusEl.textContent = "Email is required for guest checkout (so we can send updates / tracking).";
    return;
  }
  if (!String(data.phone || "").trim()) { statusEl.textContent = "Please add your phone number."; return; }
  if (!String(data.address || "").trim()) { statusEl.textContent = "Please add your delivery address."; return; }

  // Compute numeric totals
  const subtotal = cart.reduce((s,x)=>s + Number(x.qty||1)*Number(x.price||0), 0);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  const selectedMethod = String(data.paymentMethod || "cod").toLowerCase();

  // Manual payment methods must submit txn + screenshot BEFORE order is created.
  if (selectedMethod !== 'cod') {
    const txn = String(paymentTxnIdEl?.value || data.paymentTxnId || "").trim();
    const proofFile = paymentProofEl?.files?.[0] || null;
    if (!txn) { statusEl.textContent = "Transaction ID is required for manual payment."; return; }
    if (!proofFile) { statusEl.textContent = "Please upload a payment screenshot."; return; }

    try {
      statusEl.textContent = "Submitting payment proof & placing order…";
      const fd = new FormData();
      fd.append("paymentMethod", selectedMethod);
      fd.append("paymentTxnId", txn);
      if (paymentSenderEl?.value) fd.append("paymentSender", String(paymentSenderEl.value||"").trim());
      // Send the same customer/items as JSON strings
      fd.append("customerJson", JSON.stringify({ ...data, paymentTxnId: undefined, paymentSender: undefined }));
      fd.append("itemsJson", JSON.stringify(cart));
      fd.append("proof", proofFile);

      const token = getToken() || localStorage.getItem(CONFIG.TOKEN_KEY) || "";
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch("/api/public/orders-manual", {
        method: "POST",
        headers,
        credentials: "include",
        body: fd
      });
      if (r.status===401){
        statusEl.textContent="Session expired. Redirecting to login...";
        const next = encodeURIComponent(location.pathname + location.search);
        setTimeout(()=>{ location.href=`/login?next=${next}`; }, 700);
        return;
      }
      const out = await r.json().catch(()=>null);
      if (!r.ok) throw new Error(out?.error || out?.message || "Order failed");

      setCart([]);
      try {
        if (out?.id && out?.guestToken) {
          const map = JSON.parse(localStorage.getItem("guestOrderTokens") || "{}");
          map[out.id] = out.guestToken;
          localStorage.setItem("guestOrderTokens", JSON.stringify(map));
        }
      } catch {}

      statusEl.textContent = `Order submitted ✅ (ID: ${out.id}). We'll verify your payment soon.`;
      setTimeout(()=>{ location.href = token ? "/account?tab=orders" : `/track-order.html?id=${encodeURIComponent(out.id)}&token=${encodeURIComponent(out.guestToken||"")}`; }, 900);
      return;
    } catch (err) {
      statusEl.textContent = err?.message || "Could not place order.";
      return;
    }
  }

  const method = String(data.paymentMethod || "cod").toLowerCase();
  const isManual = method !== "cod";

  // Try backend
  try {
    // Always use the shared auth helper + config key so checkout works after login/signup
    const token = getToken() || localStorage.getItem(CONFIG.TOKEN_KEY) || "";
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    let r;
    if (isManual) {
      // Require payment fields
      const txnId = String(paymentTxnIdEl?.value || "").trim();
      const proofFile = paymentProofEl?.files?.[0] || null;
      if (!txnId) {
        statusEl.textContent = "Please enter your Transaction ID.";
        return;
      }
      if (!proofFile) {
        statusEl.textContent = "Please upload your payment screenshot.";
        return;
      }

      statusEl.textContent = "Uploading payment proof & placing order…";
      const fd = new FormData();
      fd.append("paymentMethod", method);
      fd.append("paymentTxnId", txnId);
      if (paymentSenderEl?.value) fd.append("paymentSender", String(paymentSenderEl.value));
      fd.append("customerJson", JSON.stringify({ ...data, deliveryArea: deliveryAreaEl?.value || "dhaka" }));
      fd.append("itemsJson", JSON.stringify(cart));
      fd.append("proof", proofFile);

      // For multipart we must NOT set Content-Type manually
      const h2 = {};
      if (token) h2.Authorization = `Bearer ${token}`;
      r = await fetch("/api/public/orders-manual", {
        method: "POST",
        headers: h2,
        credentials: "include",
        body: fd
      });
    } else {
      // COD normal order
      r = await fetch("/api/public/orders", {
        method: "POST",
        headers,
        // ✅ IMPORTANT: send cookies too (Google session login)
        credentials: "include",
        body: JSON.stringify({ customer: { ...data, deliveryArea: deliveryAreaEl?.value || "dhaka" }, items: cart, shipping, total, paymentMethod: "cod" })
      });
    }
    if (r.status===401){
      statusEl.textContent="Session expired. Redirecting to login...";
      const next = encodeURIComponent(location.pathname + location.search);
      setTimeout(()=>{ location.href=`/login?next=${next}`; }, 700);
      return;
    }
    if (!r.ok) {
      let msg = "Order API failed";
      try {
        const t = await r.text();
        const j = t ? JSON.parse(t) : null;
        msg = j?.error || j?.message || msg;
      } catch {
        try { msg = await r.text(); } catch {}
      }
      throw new Error(msg);
    }
    const out = await r.json();
    setCart([]);
    // Save guest token for tracking (if any)
    try {
      if (out?.id && out?.guestToken) {
        const map = JSON.parse(localStorage.getItem("guestOrderTokens") || "{}");
        map[out.id] = out.guestToken;
        localStorage.setItem("guestOrderTokens", JSON.stringify(map));
      }
    } catch {}

    if (token) {
      statusEl.textContent = `Order placed ✅ (ID: ${out.id}) Redirecting to your dashboard...`;
      setTimeout(()=>{ location.href="/account?tab=orders"; }, 900);
    } else {
      const t = out?.guestToken ? `&token=${encodeURIComponent(out.guestToken)}` : "";
      statusEl.innerHTML = `Order placed ✅ (ID: <b>${out.id}</b>)<br/>Track your order: <a href="./track-order.html?id=${encodeURIComponent(out.id)}${t}">Open tracking page</a>`;
    }
    return;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Could not place order. Please try again (server error).";
  }
});
