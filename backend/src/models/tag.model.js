import { db, nowISO } from "../db/index.js";

function uid(prefix = "tag") {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

export const Tag = {
  // সব tag (admin list)
  list() {
    return db
      .prepare("SELECT * FROM tags ORDER BY createdAt DESC")
      .all();
  },

  // single tag
  get(id) {
    return db.prepare("SELECT * FROM tags WHERE id=?").get(id);
  },

  // নতুন tag
  create(data) {
    if (!data?.key || !data?.label) {
      throw new Error("key and label are required");
    }

    const id = uid();
    db.prepare(
      "INSERT INTO tags (id,key,label,createdAt) VALUES (?,?,?,?)"
    ).run(id, data.key, data.label, nowISO());

    return this.get(id);
  },

  // update tag
  update(id, data) {
    const t = this.get(id);
    if (!t) return null;

    db.prepare(
      "UPDATE tags SET key=?, label=? WHERE id=?"
    ).run(
      data.key ?? t.key,
      data.label ?? t.label,
      id
    );

    return this.get(id);
  },

  // delete tag
  remove(id) {
    db.prepare("DELETE FROM tags WHERE id=?").run(id);
    return true;
  }
};
