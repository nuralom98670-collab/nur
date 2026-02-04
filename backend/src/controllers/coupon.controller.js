import { Coupon } from "../models/coupon.model.js";

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (!isFinite(t)) return false;
  return t < Date.now();
}

export function computeDiscount(coupon, subtotal) {
  const sub = Math.max(0, Number(subtotal || 0));
  if (!coupon) return { ok: false, reason: "Invalid coupon" };
  if (Number(coupon.active || 0) !== 1) return { ok: false, reason: "Coupon inactive" };
  if (isExpired(coupon.expiresAt)) return { ok: false, reason: "Coupon expired" };

  const minSub = Math.max(0, Number(coupon.minSubtotal || 0));
  if (sub < minSub) return { ok: false, reason: `Minimum subtotal ৳${minSub} required` };

  const type = String(coupon.type || "percent").toLowerCase();
  const val = Math.max(0, Number(coupon.value || 0));
  let discount = 0;
  if (type === "percent") {
    discount = (sub * val) / 100;
  } else {
    discount = val;
  }

  const maxD = coupon.maxDiscount == null || coupon.maxDiscount === "" ? null : Number(coupon.maxDiscount);
  if (maxD != null && isFinite(maxD) && maxD >= 0) discount = Math.min(discount, maxD);
  discount = Math.min(discount, sub);
  discount = Math.max(0, discount);
  return { ok: true, discount };
}

export const CouponController = {
  // Admin
  adminList(req, res) {
    return res.json(Coupon.list());
  },
  adminCreate(req, res) {
    const out = Coupon.create(req.body || {});
    if (out?.error) return res.status(400).json({ error: out.error });
    return res.json(out);
  },
  adminDelete(req, res) {
    const out = Coupon.remove(req.params.id);
    if (!out) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  },

  // Public validate (used on checkout)
  publicValidate(req, res) {
    const code = String(req.query?.code || "").trim();
    const subtotal = Number(req.query?.subtotal || 0);
    if (!code) return res.status(400).json({ valid: false, error: "Code required" });
    const c = Coupon.getByCode(code);
    const r = computeDiscount(c, subtotal);
    if (!r.ok) return res.json({ valid: false, reason: r.reason });
    return res.json({
      valid: true,
      code: String(c.code || "").toUpperCase(),
      type: c.type,
      value: Number(c.value || 0),
      discount: Number(r.discount || 0),
    });
  },
};
