import { db, nowISO } from "../db/index.js";

export const Service = {
  list() { return db.prepare("SELECT * FROM services").all(); },
  get(id) { return db.prepare("SELECT * FROM services WHERE id=?").get(id); },
  restart(id) {
    const s = this.get(id); if(!s) return null;
    db.prepare("UPDATE services SET lastRestartAt=? WHERE id=?").run(nowISO(), id);
    return this.get(id);
  }
};
