import { db, nowISO } from "../db/index.js";

function uid(prefix="rev"){ return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }

export const Review = {
  listByProduct(productId){
    // Public-facing list: show only approved reviews
    return db.prepare("SELECT * FROM reviews WHERE productId=? AND status='approved' ORDER BY createdAt DESC").all(productId);
  },
  add({ productId, userId=null, name=null, rating, body=null }){
    const id = uid();
    const r = Math.max(1, Math.min(5, Number(rating||0)));
    const now = nowISO();
    // New reviews start as pending so admin can moderate
    db.prepare("INSERT INTO reviews (id,productId,userId,name,rating,body,status,adminNote,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id, productId, userId, name, r, body, 'pending', null, now, now);
    return db.prepare("SELECT * FROM reviews WHERE id=?").get(id);
  }
  ,
  listAll(){
    return db.prepare(
      "SELECT r.*, p.name as productName, u.email as userEmail, u.name as userName FROM reviews r " +
      "LEFT JOIN products p ON p.id=r.productId " +
      "LEFT JOIN users u ON u.id=r.userId " +
      "ORDER BY r.createdAt DESC"
    ).all();
  },
  updateStatus(id, status, adminNote=null){
    const s = String(status||'').toLowerCase();
    const allowed = new Set(['pending','approved','hidden']);
    if(!allowed.has(s)) return { error: 'Invalid status' };
    db.prepare("UPDATE reviews SET status=?, adminNote=?, updatedAt=? WHERE id=?")
      .run(s, adminNote, nowISO(), id);
    return db.prepare("SELECT * FROM reviews WHERE id=?").get(id);
  },
  remove(id){
    return db.prepare("DELETE FROM reviews WHERE id=?").run(id);
  }
  ,
  listByUser(userId){
    return db.prepare("SELECT * FROM reviews WHERE userId=? ORDER BY createdAt DESC").all(userId);
  }
  ,
  // Home page testimonials: show latest approved reviews across products
  listApprovedRecent(limit=6){
    const lim = Math.max(1, Math.min(30, Number(limit||6)));
    return db.prepare(
      "SELECT r.*, p.name as productName FROM reviews r " +
      "LEFT JOIN products p ON p.id=r.productId " +
      "WHERE r.status='approved' " +
      "ORDER BY r.createdAt DESC LIMIT ?"
    ).all(lim);
  }
};
