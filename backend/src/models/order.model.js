import { db, nowISO } from "../db/index.js";
import { OrderEvent } from "./order_event.model.js";
function uid(prefix="ord"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const Order = {
  list() { return db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all(); },
  get(id) { return db.prepare("SELECT * FROM orders WHERE id=?").get(id); },
  create({
    customer,
    items,
    subtotal=null,
    discount=0,
    couponCode=null,
    shipping=0,
    total,
    paymentMethod='cod',
    userId=null,
    guestToken=null,
    paymentStatus=null,
    paymentProvider=null,
    paymentTxnId=null,
    paymentSender=null,
    paymentAmount=null,
    paymentProof=null,
    paymentSubmittedAt=null,
  }) {
    const id = uid("ord");
    const createdAt = nowISO();
    const updatedAt = createdAt;
    // paymentStatus defaults:
    // - cod: not_required
    // - manual methods: unpaid
    const pm = String(paymentMethod||'cod');
    const ps = paymentStatus
      ? String(paymentStatus)
      : (pm === 'cod' ? 'not_required' : 'unpaid');

    db.prepare(`
      INSERT INTO orders (
        id,userId,guestToken,
        customerJson,itemsJson,
        subtotal,discount,couponCode,shipping,total,
        paymentMethod,paymentStatus,paymentProvider,paymentTxnId,paymentSender,paymentAmount,paymentProof,paymentSubmittedAt,
        status,createdAt,updatedAt
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      userId,
      guestToken,
      JSON.stringify(customer||{}),
      JSON.stringify(items||[]),
      subtotal == null ? null : Number(subtotal||0),
      Number(discount||0),
      couponCode ? String(couponCode).toUpperCase() : null,
      Number(shipping||0),
      Number(total||0),
      pm,
      ps,
      (paymentProvider != null ? String(paymentProvider) : (pm === 'cod' ? null : pm)),
      paymentTxnId ? String(paymentTxnId) : null,
      paymentSender ? String(paymentSender) : null,
      paymentAmount != null ? Number(paymentAmount) : null,
      paymentProof ? String(paymentProof) : null,
      paymentSubmittedAt ? String(paymentSubmittedAt) : null,
      "pending",
      createdAt,
      updatedAt
    );
    // Timeline: initial status event
    try { OrderEvent.add({ orderId: id, status: 'pending', note: null, actor: userId ? 'user' : 'system' }); } catch {}
    return this.get(id);
  },
  updateStatus(id, status) {
    const o = this.get(id); if(!o) return null;
    const allowed = new Set(["pending","confirmed","processing","paid","shipped","delivered","cancelled","rejected","refunded"]);
    const s = String(status||"").toLowerCase();
    if(!allowed.has(s)) return { error: "Invalid status" };

    // Enforce a simple forward workflow so admin updates follow:
    // pending -> confirmed -> processing -> shipped -> delivered
    // (admins can also reject/cancel/refund depending on current status)
    const cur = String(o.status || 'pending').toLowerCase();
    const transitions = {
      pending: new Set(['confirmed','rejected','cancelled']),
      confirmed: new Set(['processing','cancelled','rejected']),
      processing: new Set(['shipped','cancelled']),
      paid: new Set(['processing','shipped','refunded','cancelled']),
      shipped: new Set(['delivered','refunded']),
      delivered: new Set(['refunded']),
      cancelled: new Set([]),
      rejected: new Set([]),
      refunded: new Set([])
    };
    if (cur !== s) {
      const ok = transitions[cur] ? transitions[cur].has(s) : true;
      if (!ok) return { error: `Invalid transition: ${cur} -> ${s}` };
    }
    db.prepare("UPDATE orders SET status=?, updatedAt=? WHERE id=?").run(s, nowISO(), id);
    // Timeline event
    try { OrderEvent.add({ orderId: id, status: s, note: null, actor: 'admin' }); } catch {}
    return this.get(id);
  },
  updateAdminNote(id, note){
    const o = this.get(id); if(!o) return null;
    db.prepare("UPDATE orders SET adminNote=?, updatedAt=? WHERE id=?")
      .run(note || null, nowISO(), id);
    return this.get(id);
  },
  markPaid(id){
    const r = this.updateStatus(id, "paid");
    return r?.error ? null : r;
  },
  markShipped(id){
    const r = this.updateStatus(id, "shipped");
    return r?.error ? null : r;
  },
  newOrders(limit=5){
    return db.prepare("SELECT * FROM orders WHERE status = 'pending' ORDER BY createdAt DESC LIMIT ?").all(limit);
  }
  ,
  submitPaymentProof(id, { provider, txnId, sender, amount, proofDataUrl }){
    const o = this.get(id); if(!o) return null;
    const pm = String(o.paymentMethod||'cod');
    if (pm === 'cod') return { error: "Payment proof is not required for COD" };
    const p = String(provider || pm).toLowerCase();
    if (p !== pm) {
      // allow if provider missing; but if provided and mismatched, block
      return { error: "Payment provider mismatch" };
    }
    const tx = String(txnId||"").trim();
    if(!tx) return { error: "Transaction ID is required" };
    const pf = String(proofDataUrl||"").trim();
    if(!pf || !pf.startsWith("data:image")) return { error: "Payment proof image is required" };

    db.prepare(`UPDATE orders
      SET paymentStatus='submitted', paymentProvider=?, paymentTxnId=?, paymentSender=?, paymentAmount=?, paymentProof=?, paymentSubmittedAt=?, paymentReviewedAt=NULL, paymentReviewNote=NULL, updatedAt=?
      WHERE id=?
    `).run(
      pm,
      tx,
      sender ? String(sender).trim() : null,
      amount != null ? Number(amount) : null,
      pf,
      nowISO(),
      nowISO(),
      id
    );
    try { OrderEvent.add({ orderId: id, status: 'paid', note: 'Payment submitted (awaiting verification)', actor: 'user' }); } catch {}
    return this.get(id);
  },

  reviewPayment(id, { approve, note }){
    const o = this.get(id); if(!o) return null;
    const pm = String(o.paymentMethod||'cod');
    if(pm === 'cod') return { error: "COD does not require payment verification" };
    const next = approve ? 'verified' : 'rejected';
    db.prepare(`UPDATE orders
      SET paymentStatus=?, paymentReviewedAt=?, paymentReviewNote=?, updatedAt=?
      WHERE id=?
    `).run(next, nowISO(), note ? String(note) : null, nowISO(), id);
    // If approved, also mark order as paid (workflow)
    if(approve){
      const r = this.updateStatus(id, 'paid');
      if(r?.error){
        // keep payment verified even if status transition blocked
      }
    }
    try { OrderEvent.add({ orderId: id, status: approve ? 'paid' : 'rejected', note: note ? String(note) : (approve ? 'Payment verified' : 'Payment rejected'), actor: 'admin' }); } catch {}
    return this.get(id);
  }
};
