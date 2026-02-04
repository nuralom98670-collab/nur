import { db, nowISO } from "../db/index.js";
function uid(prefix="svc"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const ServiceItem = {
  list(){ return db.prepare("SELECT * FROM service_items ORDER BY createdAt DESC").all(); },
  get(id){ return db.prepare("SELECT * FROM service_items WHERE id=?").get(id); },
  create(data){
    const id = uid("svc");
    const createdAt = nowISO(); const updatedAt = createdAt;
    db.prepare(`INSERT INTO service_items (id,title,body,price,imageUrl,galleryJson,needsFiles,filesHint,createdAt,updatedAt)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(
        id,
        data.title,
        data.body || "",
        Number(data.price||0),
        data.imageUrl || null,
        data.galleryJson || null,
        Number(data.needsFiles ? 1 : 0),
        data.filesHint || null,
        createdAt,
        updatedAt
      );
    return this.get(id);
  },
  update(id,data){
    const s=this.get(id); if(!s) return null;
    db.prepare(`UPDATE service_items SET title=?, body=?, price=?, imageUrl=?, galleryJson=?, needsFiles=?, filesHint=?, updatedAt=? WHERE id=?`)
      .run(
        data.title ?? s.title,
        data.body ?? s.body,
        Number(data.price ?? s.price),
        data.imageUrl ?? s.imageUrl,
        data.galleryJson ?? s.galleryJson,
        Number((data.needsFiles ?? s.needsFiles) ? 1 : 0),
        data.filesHint ?? s.filesHint,
        nowISO(),
        id
      );
    return this.get(id);
  },
  remove(id){ db.prepare("DELETE FROM service_items WHERE id=?").run(id); return true; }
};
