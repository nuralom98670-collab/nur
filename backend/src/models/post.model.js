import { db, nowISO } from "../db/index.js";
function uid(prefix="post"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const Post = {
  listAdmin() {
    return db.prepare("SELECT * FROM posts ORDER BY createdAt DESC").all();
  },
  listPublished(categoryKey=null) {
    if (categoryKey) {
      return db.prepare("SELECT * FROM posts WHERE status='published' AND categoryKey=? ORDER BY createdAt DESC").all(categoryKey);
    }
    return db.prepare("SELECT * FROM posts WHERE status='published' ORDER BY createdAt DESC").all();
  },
  get(id) {
    return db.prepare("SELECT * FROM posts WHERE id=?").get(id);
  },
  create(data) {
    const id = uid("post");
    const createdAt = nowISO();
    const updatedAt = createdAt;

    db.prepare(`
      INSERT INTO posts (id,title,body,coverImageUrl,videoUrl,imagesJson,categoryKey,categoryLabel,metaTitle,metaDescription,slug,status,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      data.title,
      data.body,
      data.coverImageUrl || null,
      data.videoUrl || null,
      data.imagesJson || null,
      data.categoryKey || null,
      data.categoryLabel || null,
      data.metaTitle || null,
      data.metaDescription || null,
      data.slug || null,
      data.status || "draft",
      createdAt,
      updatedAt
    );

    return this.get(id);
  },
  update(id, data) {
    const p = this.get(id);
    if (!p) return null;

    db.prepare(`
      UPDATE posts SET title=?, body=?, coverImageUrl=?, videoUrl=?, imagesJson=?, categoryKey=?, categoryLabel=?, metaTitle=?, metaDescription=?, slug=?, status=?, updatedAt=? WHERE id=?
    `).run(
      data.title ?? p.title,
      data.body ?? p.body,
      data.coverImageUrl ?? p.coverImageUrl,
      data.videoUrl ?? p.videoUrl,
      data.imagesJson ?? p.imagesJson,
      data.categoryKey ?? p.categoryKey,
      data.categoryLabel ?? p.categoryLabel,
      data.metaTitle ?? p.metaTitle,
      data.metaDescription ?? p.metaDescription,
      data.slug ?? p.slug,
      data.status ?? p.status,
      nowISO(),
      id
    );

    return this.get(id);
  },
  remove(id) {
    db.prepare("DELETE FROM posts WHERE id=?").run(id);
    return true;
  }
};
