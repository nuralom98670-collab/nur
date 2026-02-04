import { db, nowISO } from "../db/index.js";
import { Product } from "../models/product.model.js";
import { Wishlist } from "../models/wishlist.model.js";
import { Review } from "../models/review.model.js";
import { Settings } from "../models/settings.model.js";
import { OrderEvent } from "../models/order_event.model.js";
import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";

function withParsedProduct(p){
  if(!p) return null;
  const images = (()=>{ try { return JSON.parse(p.imagesJson||"[]"); } catch { return []; } })();
  const categories = (()=>{ try { return JSON.parse(p.categoriesJson||"[]"); } catch { return []; } })();
  return { ...p, images, categories };
}

function parseJson(str, fallback){
  try { return JSON.parse(str||""); } catch { return fallback; }
}

export const AccountController = {
  myOrders(req,res){
    // Show orders for this user. Also attach guest orders that match the user's email/phone.
    const userId = req.user.id;
    const me = db.prepare("SELECT id,name,email FROM users WHERE id=?").get(userId);
    const email = String(me?.email || "").trim().toLowerCase();

    // 1) User-linked orders
    const linked = db.prepare("SELECT * FROM orders WHERE userId=? ORDER BY createdAt DESC").all(userId);

    // 2) Guest orders: best-effort match by email inside customerJson (legacy)
    let guest = [];
    if (email) {
      guest = db.prepare(
        "SELECT * FROM orders WHERE (userId IS NULL OR userId='') AND lower(customerJson) LIKE ? ORDER BY createdAt DESC"
      ).all(`%"email":"${email.replace(/[%_]/g,'')}"%`);
    }

    // Attach guest orders to this user for future
    for (const o of guest) {
      try {
        db.prepare("UPDATE orders SET userId=?, updatedAt=? WHERE id=?").run(userId, new Date().toISOString(), o.id);
      } catch {}
    }

    const rows = [...linked, ...guest]
      .reduce((acc, o) => { acc[o.id]=o; return acc; }, {});
    const out = Object.values(rows)
      .sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')))
      .map(o=>({
        ...o,
        customer: parseJson(o.customerJson, {}),
        items: parseJson(o.itemsJson, []),
        events: (()=>{ try { return OrderEvent.listByOrder(o.id); } catch { return []; } })()
      }));
    res.json(out);
  },
  myWishlist(req,res){
    const rows = Wishlist.listByUser(req.user.id);
    // Return a flat product list for frontend simplicity
    const items = rows.map(r => withParsedProduct(Product.get(r.productId)))
      .filter(Boolean);
    res.json(items);
  },
  addWishlist(req,res){
    const { productId } = req.body || {};
    if(!productId) return res.status(400).json({ error: "productId required" });
    Wishlist.add(req.user.id, productId);
    res.json({ ok:true });
  },
  removeWishlist(req,res){
    const { productId } = req.body || {};
    if(!productId) return res.status(400).json({ error: "productId required" });
    Wishlist.remove(req.user.id, productId);
    res.json({ ok:true });
  }
  ,
  submitPaymentProof(req,res){
    const id = String(req.params.id || '').trim();
    if(!id) return res.status(400).json({ error: "Missing order id" });
    const o = Order.get(id);
    if(!o) return res.status(404).json({ error: "Not found" });
    if(String(o.userId || '') !== String(req.user.id || '')){
      return res.status(401).json({ error: "Unauthorized" });
    }
    const body = req.body || {};
    const r = Order.submitPaymentProof(id, {
      provider: body.provider,
      txnId: body.txnId,
      sender: body.sender,
      amount: body.amount,
      proofDataUrl: body.proofDataUrl
    });
    if(!r) return res.status(404).json({ error: "Not found" });
    if(r.error) return res.status(400).json({ error: r.error });

    // Notify the user (confirmation) — admin will see it in order view
    try {
      Notification.add({
        userId: req.user.id,
        type: 'order',
        title: `Payment submitted for #${id}`,
        body: `We received your payment details. We'll verify and update your order soon.`
      });
    } catch {}

    return res.json({ ok: true });
  }
  ,
  cancelOrder(req,res){
    const id = String(req.params.id || '').trim();
    if(!id) return res.status(400).json({ error: 'Missing order id' });
    const o = Order.get(id);
    if(!o) return res.status(404).json({ error: 'Not found' });
    if(String(o.userId || '') !== String(req.user.id || '')){
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = String(o.status || 'pending').toLowerCase();
    // Only allow cancellation before processing/shipping
    const cancellableStatuses = new Set(['pending','confirmed']);
    if(!cancellableStatuses.has(status)){
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    // Time window: configurable (minutes)
    const settings = (()=>{ try { return Settings.getAll(); } catch { return {}; } })();
    const WINDOW_MIN = Math.max(1, Number(settings.cancelWindowMin || 10));
    const createdTs = Date.parse(o.createdAt || '');
    if(!createdTs) return res.status(400).json({ error: 'Invalid order time' });
    const ageMin = (Date.now() - createdTs) / 60000;
    if(ageMin > WINDOW_MIN){
      return res.status(400).json({ error: `Cancellation window expired (${WINDOW_MIN} minutes)` });
    }

    // Update status
    const reason = String((req.body||{}).reason || '').trim();
    db.prepare("UPDATE orders SET status='cancelled', cancelledAt=?, cancelReason=?, refundStatus=CASE WHEN paymentMethod!='cod' THEN 'requested' ELSE refundStatus END, updatedAt=? WHERE id=?").run(nowISO(), reason || null, reason || null, nowISO(), id);
    try { OrderEvent.add({ orderId: id, status: 'cancelled', note: reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer', actor: 'user' }); } catch {}
    try {
      Notification.add({
        userId: req.user.id,
        type: 'order',
        title: `Order #${id} cancelled`,
        body: `You cancelled the order within ${WINDOW_MIN} minutes.`
      });
    } catch {}

    return res.json({ ok:true });
  }
  ,
  myReviews(req, res){
    const rows = Review.listByUser(req.user.id);
    const out = rows.map(r => {
      const p = Product.get(r.productId);
      return { ...r, productTitle: p?.name || null, productName: p?.name || null };
    });
    res.json(out);
  }
  ,
  myNotifications(req,res){
    const limit = Number(req.query?.limit || 30);
    res.json(Notification.listByUser(req.user.id, limit));
  },
  notificationsUnreadCount(req,res){
    res.json({ count: Notification.unreadCount(req.user.id) });
  },
  markNotificationsRead(req,res){
    const { id } = req.body || {};
    Notification.markRead(req.user.id, id || null);
    res.json({ ok:true });
  }
};
