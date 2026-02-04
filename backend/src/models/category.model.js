import { db, nowISO } from "../db/index.js";
function uid(prefix="cat"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const Category = {
  list(kind=null) {
    if (kind) return db.prepare("SELECT * FROM categories WHERE kind=? ORDER BY createdAt DESC").all(kind);
    return db.prepare("SELECT * FROM categories ORDER BY createdAt DESC").all();
  },
  create(data) {
    const id = uid("cat");
    const kind = data.kind === "blog" ? "blog" : "shop";
    db.prepare("INSERT INTO categories (id,key,label,kind,createdAt) VALUES (?,?,?,?,?)")
      .run(id, data.key, data.label, kind, nowISO());
    return db.prepare("SELECT * FROM categories WHERE id=?").get(id);
  },
  remove(id) {
    db.prepare("DELETE FROM categories WHERE id=?").run(id);
    return true;
  }
};
