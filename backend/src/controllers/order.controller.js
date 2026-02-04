import { Order } from "../models/order.model.js";
import { Notification } from "../models/notification.model.js";
import { sendEmail, sendSMS } from "../utils/notify.js";
import { OrderEvent } from "../models/order_event.model.js";
import { Settings } from "../models/settings.model.js";
import { Coupon } from "../models/coupon.model.js";
import { computeDiscount } from "./coupon.controller.js";
import { AdminNotification } from "../models/admin_notification.model.js";

function parseJson(str, fallback){
  try { return JSON.parse(str||""); } catch { return fallback; }
}

function withParsed(o){
  if(!o) return o;
  return {
    ...o,
    customer: parseJson(o.customerJson, {}),
    items: parseJson(o.itemsJson, []),
    events: (()=>{ try { return OrderEvent.listByOrder(o.id); } catch { return []; } })()
  };
}

function statusLabel(s){
  const map = {
    pending: 'Order Received',
    confirmed: 'Confirmed',
    processing: 'Processing',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    refunded: 'Refunded',
  };
  return map[String(s||'pending')] || String(s||'pending');
}

async function notifyCustomer(order, newStatus){
  const c = order?.customer || {};
  const label = statusLabel(newStatus);
  const subject = `Your order ${order?.id || ''} status: ${label}`;
  const text = `Hello${c.name ? ' ' + c.name : ''},\n\nYour order #${order?.id || ''} status has been updated to: ${label}.\n\nThank you for shopping with RoboticsLeb.`;
  try {
    await sendEmail({ to: c.email, subject, text });
  } catch (e) { console.log('[EMAIL:ERR]', e?.message || e); }
  try {
    await sendSMS({ to: c.phone, text: `RoboticsLeb: Order #${order?.id || ''} is now ${label}.` });
  } catch (e) { console.log('[SMS:ERR]', e?.message || e); }
}

function createDashboardNotification(order, newStatus){
  try {
    const userId = order?.userId;
    if(!userId) return;
    const label = statusLabel(newStatus);
    Notification.add({
      userId,
      type: 'order',
      title: `Order #${order?.id || ''} updated`,
      body: `Your order status is now: ${label}`
    });
  } catch {}
}
export const OrderController = {
  publicCreate(req,res){
    const body = req.body || {};
    const customer = body.customer || {};

    // Require strong customer details for both guest and logged-in checkout.
    const name = String(customer.name || "").trim();
    const phone = String(customer.phone || "").trim();
    const address = String(customer.address || "").trim();
    const email = String(customer.email || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!phone) return res.status(400).json({ error: "Phone is required" });
    if (!address) return res.status(400).json({ error: "Address is required" });
    // For guests, email is important so they can track the order.
    if (!req.user && !email) return res.status(400).json({ error: "Email is required for guest checkout" });

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ error: "Cart is empty" });

    // Server-side subtotal (avoid trusting client totals)
    const subtotal = items.reduce((sum, it) => {
      const qty = Number(it?.qty ?? it?.quantity ?? 1);
      const price = Number(it?.price ?? it?.unitPrice ?? it?.product?.price ?? 0);
      const q = isFinite(qty) ? qty : 1;
      const p = isFinite(price) ? price : 0;
      return sum + Math.max(0, q) * Math.max(0, p);
    }, 0);

    // Server-side shipping based on settings + delivery area (fallback to client-provided shipping)
    const s = Settings.getAll();
    const deliveryDhaka = Number(s.deliveryDhaka ?? 100);
    const deliveryOutside = Number(s.deliveryOutside ?? 150);
    const area = String(customer.deliveryArea || body.deliveryArea || "dhaka").toLowerCase();
    const shipping = subtotal > 0
      ? (area === "outside" ? deliveryOutside : deliveryDhaka)
      : 0;

    // Coupon (optional) — validated on server
    const couponRaw = String(customer.coupon || body.coupon || "").trim();
    const coupon = couponRaw ? Coupon.getByCode(couponRaw) : null;
    const discRes = coupon ? computeDiscount(coupon, subtotal) : { ok: false };
    const discount = discRes.ok ? Number(discRes.discount || 0) : 0;
    const couponCode = discRes.ok ? String(coupon.code || "").toUpperCase() : null;

    // Final total
    const total = Math.max(0, subtotal + shipping - discount);

    const userId = req.user?.id || null;
    const guestToken = userId ? null : ("gt_" + Math.random().toString(16).slice(2) + Date.now().toString(16));

    const out = Order.create({
      customer: { ...customer, email },
      items,
      subtotal,
      discount,
      couponCode,
      shipping,
      total,
      paymentMethod: body.paymentMethod,
      userId,
      guestToken
    });
    // Admin notification (new order)
    try {
      AdminNotification.add({
        type: 'order',
        title: `New order #${out.id}`,
        body: `${name} placed an order (${String(body.paymentMethod||'cod').toUpperCase()}).`,
        refType: 'order',
        refId: out.id
      });
    } catch {}
    return res.json({ id: out.id, guestToken });
  },

  // Manual payment checkout: customer must submit Transaction ID + screenshot BEFORE order is created.
  // Request: multipart/form-data
  // Fields:
  //   customerJson (stringified JSON), itemsJson (stringified JSON)
  //   paymentMethod: bkash|nagad|rocket
  //   paymentTxnId, paymentSender (optional)
  // File:
  //   proof (image)
  publicCreateManual(req, res) {
    const pm = String(req.body?.paymentMethod || '').toLowerCase();
    const allowed = new Set(['bkash','nagad','rocket']);
    if (!allowed.has(pm)) return res.status(400).json({ error: 'Invalid payment method' });

    // Parse payload
    let customer = {};
    let items = [];
    try { customer = JSON.parse(req.body?.customerJson || '{}'); } catch { customer = {}; }
    try { items = JSON.parse(req.body?.itemsJson || '[]'); } catch { items = []; }

    // Validate customer details
    const name = String(customer.name || '').trim();
    const phone = String(customer.phone || '').trim();
    const address = String(customer.address || '').trim();
    const email = String(customer.email || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    if (!address) return res.status(400).json({ error: 'Address is required' });
    if (!req.user && !email) return res.status(400).json({ error: 'Email is required for guest checkout' });

    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });

    // Require proof + transaction
    const txnId = String(req.body?.paymentTxnId || '').trim();
    if (!txnId) return res.status(400).json({ error: 'Transaction ID is required' });
    if (!req.file) return res.status(400).json({ error: 'Payment proof image is required' });
    const proofUrl = `/uploads/${req.file.filename}`;

    // Subtotal/shipping/coupon computed same as normal checkout
    const subtotal = items.reduce((sum, it) => {
      const qty = Number(it?.qty ?? it?.quantity ?? 1);
      const price = Number(it?.price ?? it?.unitPrice ?? it?.product?.price ?? 0);
      const q = isFinite(qty) ? qty : 1;
      const p = isFinite(price) ? price : 0;
      return sum + Math.max(0, q) * Math.max(0, p);
    }, 0);

    const s = Settings.getAll();
    const deliveryDhaka = Number(s.deliveryDhaka ?? 100);
    const deliveryOutside = Number(s.deliveryOutside ?? 150);
    const area = String(customer.deliveryArea || 'dhaka').toLowerCase();
    const shipping = subtotal > 0 ? (area === 'outside' ? deliveryOutside : deliveryDhaka) : 0;

    const couponRaw = String(customer.coupon || '').trim();
    const coupon = couponRaw ? Coupon.getByCode(couponRaw) : null;
    const discRes = coupon ? computeDiscount(coupon, subtotal) : { ok: false };
    const discount = discRes.ok ? Number(discRes.discount || 0) : 0;
    const couponCode = discRes.ok ? String(coupon.code || '').toUpperCase() : null;
    const total = Math.max(0, subtotal + shipping - discount);

    const userId = req.user?.id || null;
    const guestToken = userId ? null : ('gt_' + Math.random().toString(16).slice(2) + Date.now().toString(16));

    const out = Order.create({
      customer: { ...customer, email },
      items,
      subtotal,
      discount,
      couponCode,
      shipping,
      total,
      paymentMethod: pm,
      paymentStatus: 'submitted',
      paymentProvider: pm,
      paymentTxnId: txnId,
      paymentSender: req.body?.paymentSender ? String(req.body.paymentSender).trim() : null,
      paymentProof: proofUrl,
      paymentSubmittedAt: new Date().toISOString(),
      userId,
      guestToken
    });

    // Notify admin inbox
    try {
      AdminNotification.add({
        type: 'order',
        title: `New order #${out.id}`,
        body: `${name} placed an order via ${pm.toUpperCase()} (payment proof submitted).`,
        refType: 'order',
        refId: out.id
      });
    } catch {}

    return res.json({ id: out.id, guestToken });
  },

  // Guest-friendly tracking endpoint:
  // - If order is linked to a user, that user must be logged in.
  // - If order is a guest order, a valid guestToken is required.
  publicTrack(req,res){
    const id = req.params.id;
    const o = Order.get(id);
    if(!o) return res.status(404).json({ error: "Not found" });
    const parsed = withParsed(o);

    // User-linked orders: only owner can view
    if (parsed.userId) {
      if (!req.user || req.user.id !== parsed.userId) return res.status(401).json({ error: "Unauthorized" });
      return res.json(parsed);
    }

    // Guest orders require token
    const token = String(req.query?.token || req.body?.token || "").trim();
    if (!parsed.guestToken || token !== parsed.guestToken) {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.json(parsed);
  },
  adminList(req,res){ return res.json(Order.list().map(withParsed)); },
  adminGet(req,res){
    const o = Order.get(req.params.id);
    if(!o) return res.status(404).json({error:"Not found"});
    const parsed = withParsed(o);
    return res.json(parsed);
  },
  updateAdminNote(req,res){
    const o = Order.updateAdminNote(req.params.id, req.body?.adminNote || req.body?.note || null);
    if(!o) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(o));
  },
  markPaid(req,res){
    const o = Order.markPaid(req.params.id);
    if(!o) return res.status(404).json({error:"Not found"});
    const parsed = withParsed(o);
    createDashboardNotification(parsed, parsed.status);
    notifyCustomer(parsed, parsed.status);
    return res.json(parsed);
  },
  markShipped(req,res){
    const o = Order.markShipped(req.params.id);
    if(!o) return res.status(404).json({error:"Not found"});
    const parsed = withParsed(o);
    notifyCustomer(parsed, parsed.status);
    createDashboardNotification(parsed, parsed.status);
    return res.json(parsed);
  }
  ,
  updateStatus(req,res){
    const r = Order.updateStatus(req.params.id, req.body?.status);
    if(!r) return res.status(404).json({error:"Not found"});
    if(r.error) return res.status(400).json({error:r.error});
    const parsed = withParsed(r);
    // notify customer (email/SMS) if configured
    notifyCustomer(parsed, parsed.status);
    // notify inside user dashboard
    createDashboardNotification(parsed, parsed.status);
    return res.json(parsed);
  }
  ,
  approvePayment(req,res){
    const id = req.params.id;
    const note = req.body?.note || req.body?.paymentReviewNote || null;
    const r = Order.reviewPayment(id, { approve: true, note });
    if(!r) return res.status(404).json({error:"Not found"});
    if(r.error) return res.status(400).json({error:r.error});
    const parsed = withParsed(r);
    // Notify customer
    try {
      if(parsed?.userId) {
        Notification.add({
          userId: parsed.userId,
          type: 'order',
          title: `Payment verified for #${parsed.id}`,
          body: `Your payment has been verified. We'll process your order now.`
        });
      }
    } catch {}
    notifyCustomer(parsed, parsed.status);
    return res.json(parsed);
  }
  ,
  rejectPayment(req,res){
    const id = req.params.id;
    const note = req.body?.note || req.body?.paymentReviewNote || "Payment rejected";
    const r = Order.reviewPayment(id, { approve: false, note });
    if(!r) return res.status(404).json({error:"Not found"});
    if(r.error) return res.status(400).json({error:r.error});
    const parsed = withParsed(r);
    try {
      if(parsed?.userId) {
        Notification.add({
          userId: parsed.userId,
          type: 'order',
          title: `Payment rejected for #${parsed.id}`,
          body: note
        });
      }
    } catch {}
    notifyCustomer(parsed, parsed.status);
    return res.json(parsed);
  }
};