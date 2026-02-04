import { db, nowISO } from "../db/index.js";
function uid(prefix="msg"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const Message = {
  list() { return db.prepare("SELECT * FROM messages ORDER BY createdAt DESC").all(); },
  get(id) { return db.prepare("SELECT * FROM messages WHERE id=?").get(id); },
  create(data) {
    const id = uid("msg");
    db.prepare(`
      INSERT INTO messages (id,name,email,subject,message,isRead,createdAt)
      VALUES (?,?,?,?,?,?,?)
    `).run(id, data.name||"", data.email||"", data.subject||"", data.message||"", 0, nowISO());
    return this.get(id);
  },
  markRead(id) {
    db.prepare("UPDATE messages SET isRead=1 WHERE id=?").run(id);
    return this.get(id);
  },
  unreadCount() {
    const r = db.prepare("SELECT COUNT(*) as c FROM messages WHERE isRead=0").get();
    return Number(r?.c || 0);
  }
};
