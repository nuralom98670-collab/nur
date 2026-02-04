import { db, nowISO } from "../db/index.js";
function uid(prefix="evt"){ return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }

export const UserEvent = {
  log({ userId=null, email=null, type, ip=null, userAgent=null }){
    const id = uid("evt");
    db.prepare(`INSERT INTO user_events (id,userId,email,type,ip,userAgent,createdAt) VALUES (?,?,?,?,?,?,?)`)
      .run(id, userId, email, String(type), ip, userAgent, nowISO());
    return { id };
  },
  recent(limit=20){
    return db.prepare(`SELECT * FROM user_events ORDER BY createdAt DESC LIMIT ?`).all(limit);
  }
};
