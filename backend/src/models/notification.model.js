import { db, nowISO } from "../db/index.js";

function uid(prefix="ntf"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const Notification = {
  add({ userId, type='system', title, body=null }){
    const id = uid();
    db.prepare(
      "INSERT INTO notifications (id,userId,type,title,body,isRead,createdAt) VALUES (?,?,?,?,?,?,?)"
    ).run(id, String(userId), String(type), String(title||'Notification'), body, 0, nowISO());
    return db.prepare("SELECT * FROM notifications WHERE id=?").get(id);
  },
  listByUser(userId, limit=30){
    return db.prepare(
      "SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC LIMIT ?"
    ).all(String(userId), Number(limit||30));
  },
  unreadCount(userId){
    const r = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE userId=? AND isRead=0")
      .get(String(userId));
    return Number(r?.c||0);
  },
  markRead(userId, id=null){
    if(id){
      db.prepare("UPDATE notifications SET isRead=1 WHERE userId=? AND id=?")
        .run(String(userId), String(id));
      return;
    }
    db.prepare("UPDATE notifications SET isRead=1 WHERE userId=?")
      .run(String(userId));
  }
};
