import { db, nowISO } from "../db/index.js";

function uid(prefix="mrep"){ return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }

export const MessageReply = {
  listByMessage(messageId){
    return db.prepare("SELECT * FROM message_replies WHERE messageId=? ORDER BY createdAt ASC").all(String(messageId));
  },
  create({ messageId, adminId=null, body="" }){
    const id = uid();
    db.prepare("INSERT INTO message_replies (id,messageId,adminId,body,createdAt) VALUES (?,?,?,?,?)").run(
      id, String(messageId), adminId ? String(adminId) : null, String(body||""), nowISO()
    );
    return db.prepare("SELECT * FROM message_replies WHERE id=?").get(id);
  }
};
