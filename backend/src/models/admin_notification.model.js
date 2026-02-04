import { db, nowISO } from "../db/index.js";

function uid(prefix="ant"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Admin-side notifications (new orders, contact messages, payment proofs, etc.)
export const AdminNotification = {
  add({ type='system', title, body=null, refType=null, refId=null }){
    const id = uid();
    db.prepare(
      "INSERT INTO admin_notifications (id,type,title,body,refType,refId,isRead,createdAt) VALUES (?,?,?,?,?,?,?,?)"
    ).run(
      id,
      String(type||'system'),
      String(title||'Notification'),
      body != null ? String(body) : null,
      refType != null ? String(refType) : null,
      refId != null ? String(refId) : null,
      0,
      nowISO()
    );
    return db.prepare("SELECT * FROM admin_notifications WHERE id=?").get(id);
  },
  list(limit=30){
    return db.prepare(
      "SELECT * FROM admin_notifications ORDER BY createdAt DESC LIMIT ?"
    ).all(Number(limit||30));
  },
  unreadCount(){
    const r = db.prepare("SELECT COUNT(*) as c FROM admin_notifications WHERE isRead=0").get();
    return Number(r?.c||0);
  },
  markRead(id=null){
    if(id){
      db.prepare("UPDATE admin_notifications SET isRead=1 WHERE id=?").run(String(id));
      return;
    }
    db.prepare("UPDATE admin_notifications SET isRead=1").run();
  }
};
