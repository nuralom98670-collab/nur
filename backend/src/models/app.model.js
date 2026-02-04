import { db, nowISO } from "../db/index.js";
function uid(prefix="app"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const AppItem = {
  list(){ return db.prepare("SELECT * FROM apps ORDER BY createdAt DESC").all(); },
  get(id){ return db.prepare("SELECT * FROM apps WHERE id=?").get(id); },
  create(data){
    const id = uid("app");
    const createdAt = nowISO(); const updatedAt = createdAt;
    db.prepare(`INSERT INTO apps (id,name,body,apkUrl,imagesJson,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)`)
      .run(id, data.name, data.body || "", data.apkUrl || null, data.imagesJson || null, createdAt, updatedAt);
    return this.get(id);
  },
  update(id,data){
    const a=this.get(id); if(!a) return null;
    db.prepare(`UPDATE apps SET name=?, body=?, apkUrl=?, imagesJson=?, updatedAt=? WHERE id=?`)
      .run(data.name ?? a.name, data.body ?? a.body, data.apkUrl ?? a.apkUrl, data.imagesJson ?? a.imagesJson, nowISO(), id);
    return this.get(id);
  },
  remove(id){ db.prepare("DELETE FROM apps WHERE id=?").run(id); return true; }
};
