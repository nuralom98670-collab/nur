import { db, nowISO } from "../db/index.js";

function uid(prefix="wl"){ return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }

export const Wishlist = {
  listByUser(userId){
    return db.prepare("SELECT * FROM wishlists WHERE userId=? ORDER BY createdAt DESC").all(userId);
  },
  add(userId, productId){
    const id = uid();
    try{
      db.prepare("INSERT INTO wishlists (id,userId,productId,createdAt) VALUES (?,?,?,?)")
        .run(id, userId, productId, nowISO());
    }catch{
      // ignore duplicates
    }
    return { ok:true };
  },
  remove(userId, productId){
    db.prepare("DELETE FROM wishlists WHERE userId=? AND productId=?").run(userId, productId);
    return { ok:true };
  }
};
