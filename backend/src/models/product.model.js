import { db, nowISO } from "../db/index.js";

function uid(prefix="p"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const Product = {
  list() {
    return db.prepare("SELECT * FROM products ORDER BY createdAt DESC").all();
  },
  get(id) {
    return db.prepare("SELECT * FROM products WHERE id=?").get(id);
  },
  create(data) {
    const id = uid("p");
    const createdAt = nowISO();
    const updatedAt = createdAt;

    // Multi-category support: categoriesJson is a JSON array of {key,label}
    let categoriesJson = data.categoriesJson || null;
    let primaryKey = data.categoryKey || null;
    let primaryLabel = data.categoryLabel || data.category || null;
    try {
      if (categoriesJson) {
        const arr = typeof categoriesJson === "string" ? JSON.parse(categoriesJson) : categoriesJson;
        if (Array.isArray(arr) && arr.length) {
          const first = arr[0] || {};
          primaryKey = primaryKey || first.key || null;
          primaryLabel = primaryLabel || first.label || null;
          categoriesJson = JSON.stringify(arr);
        } else {
          categoriesJson = null;
        }
      }
    } catch {
      categoriesJson = null;
    }

    // Gallery fix: if imagesJson exists, always use its FIRST image as imageUrl.
    let imagesJson = data.imagesJson || null;
    let imageUrl = data.imageUrl || null;
    try{
      if(imagesJson){
        const arr = typeof imagesJson === 'string' ? JSON.parse(imagesJson) : imagesJson;
        if(Array.isArray(arr) && arr.length){
          imagesJson = JSON.stringify(arr);
          imageUrl = arr[0] || imageUrl;
        }
      }
    }catch{}

    db.prepare(`
      INSERT INTO products (id,name,categoryKey,categoryLabel,categoriesJson,price,discountPrice,stock,desc,imageUrl,imagesJson,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      data.name,
      primaryKey,
      primaryLabel,
      categoriesJson,
      Number(data.price || 0),
      Number(data.discountPrice || 0),
      Number(data.stock || 0),
      data.desc || "",
      imageUrl,
      imagesJson,
      createdAt,
      updatedAt
    );

    return this.get(id);
  },
  update(id, data) {
    const p = this.get(id);
    if (!p) return null;

    
    let categoriesJson = data.categoriesJson ?? p.categoriesJson;
    let primaryKey = data.categoryKey ?? p.categoryKey;
    let primaryLabel = (data.categoryLabel ?? data.category ?? p.categoryLabel);
    try {
      if (categoriesJson) {
        const arr = typeof categoriesJson === "string" ? JSON.parse(categoriesJson) : categoriesJson;
        if (Array.isArray(arr) && arr.length) {
          const first = arr[0] || {};
          primaryKey = primaryKey || first.key || null;
          primaryLabel = primaryLabel || first.label || null;
          categoriesJson = JSON.stringify(arr);
        } else {
          categoriesJson = null;
        }
      }
    } catch {
      // keep old
    }

    // Gallery fix: if imagesJson is provided (or already exists), keep imageUrl synced to FIRST image.
    let imagesJson = data.imagesJson ?? p.imagesJson;
    let imageUrl = data.imageUrl ?? p.imageUrl;
    try{
      if(imagesJson){
        const arr = typeof imagesJson === 'string' ? JSON.parse(imagesJson) : imagesJson;
        if(Array.isArray(arr) && arr.length){
          imagesJson = JSON.stringify(arr);
          imageUrl = arr[0] || imageUrl;
        }
      }
    }catch{}

    db.prepare(`
      UPDATE products
      SET name=?, categoryKey=?, categoryLabel=?, categoriesJson=?, price=?, discountPrice=?, stock=?, desc=?, imageUrl=?, imagesJson=?, updatedAt=?
      WHERE id=?
    `).run(
      data.name ?? p.name,
      primaryKey,
      primaryLabel,
      categoriesJson,
      Number(data.price ?? p.price),
      Number(data.discountPrice ?? p.discountPrice ?? 0),
      Number(data.stock ?? p.stock),
      data.desc ?? p.desc,
      imageUrl,
      imagesJson,
      nowISO(),
      id
    );

    return this.get(id);
  },

  remove(id) {
    db.prepare("DELETE FROM products WHERE id=?").run(id);
    return true;
  },
  lowStock(limit=5) {
    return db.prepare("SELECT * FROM products ORDER BY stock ASC LIMIT ?").all(limit);
  }
};
