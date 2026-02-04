import { db, nowISO } from "../db/index.js";

function uid(prefix="oe"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const OrderEvent = {
  add({ orderId, status, note=null, actor='system' }){
    const id = uid();
    db.prepare(
      "INSERT INTO order_events (id,orderId,status,note,actor,createdAt) VALUES (?,?,?,?,?,?)"
    ).run(id, String(orderId), String(status), note, actor, nowISO());
    return db.prepare("SELECT * FROM order_events WHERE id=?").get(id);
  },
  listByOrder(orderId){
    return db.prepare("SELECT * FROM order_events WHERE orderId=? ORDER BY createdAt ASC")
      .all(String(orderId));
  }
};
