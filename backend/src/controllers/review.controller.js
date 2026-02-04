import { Review } from "../models/review.model.js";
import { db } from "../db/index.js";
import { Notification } from "../models/notification.model.js";

function parseJson(str, fallback){
  try { return JSON.parse(str||""); } catch { return fallback; }
}

function hasPurchasedProduct({ userId, productId }){
  if(!userId || !productId) return false;

  // Accept any non-cancelled/rejected/refunded order as "purchased".
  // If you want strictness, change allowedStatuses to only ["delivered"].
  const allowedStatuses = new Set(["pending","confirmed","processing","paid","shipped","delivered"]);
  const rows = db.prepare("SELECT itemsJson, status FROM orders WHERE userId=? ORDER BY createdAt DESC").all(userId);

  for (const o of rows) {
    const st = String(o?.status || "pending").toLowerCase();
    if (!allowedStatuses.has(st)) continue;
    const items = parseJson(o?.itemsJson, []);
    for (const it of (Array.isArray(items) ? items : [])) {
      const pid = it?.productId || it?.id;
      if (String(pid) === String(productId)) return true;
    }
  }
  return false;
}

export const ReviewController = {
  listForProduct(req,res){
    const productId = req.params.productId;
    res.json(Review.listByProduct(productId));
  },
  listForHome(req,res){
    const limit = Number(req.query?.limit || 6);
    const rows = Review.listApprovedRecent(limit);
    // Keep payload small and safe for homepage
    const out = (rows||[]).map(r => ({
      id: r.id,
      name: r.name || r.userName || null,
      rating: r.rating,
      body: r.body || '',
      productId: r.productId,
      productName: r.productName || null,
      createdAt: r.createdAt
    }));
    res.json({ items: out });
  },
  adminList(req,res){
    res.json(Review.listAll());
  },
  adminDelete(req,res){
    const id = req.params.id;
    Review.remove(id);
    res.json({ ok:true });
  },
  adminUpdateStatus(req,res){
    const id = req.params.id;
    const { status, adminNote } = req.body || {};
    const r = Review.updateStatus(id, status, adminNote || null);
    if(!r) return res.status(404).json({ error: 'Not found' });
    if(r.error) return res.status(400).json({ error: r.error });
    // If approved/hidden, inform the user in dashboard
    try {
      if(r?.userId && (String(r.status)==='approved' || String(r.status)==='hidden')) {
        Notification.add({
          userId: r.userId,
          type: 'review',
          title: `Your review was ${r.status}`,
          body: r.status === 'approved' ? 'Your review is now visible on the product page.' : 'Your review has been hidden by admin.'
        });
      }
    } catch {}
    res.json(r);
  },
  create(req,res){
    const { productId, rating, body } = req.body || {};
    if(!req.user?.id) return res.status(401).json({ error: "Login required" });
    if(!productId) return res.status(400).json({ error: "productId required" });

    // ✅ Restrict reviews to purchased products
    const ok = hasPurchasedProduct({ userId: req.user.id, productId });
    if(!ok) return res.status(403).json({ error: "You can review only products you purchased" });

    const r = Review.add({ productId, userId: req.user.id, name: req.user?.name || null, rating, body });
    res.json(r);
  }
};
