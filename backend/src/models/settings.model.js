import { db } from "../db/index.js";

export const Settings = {
  getAll() {
    const rows = db.prepare("SELECT k,v FROM settings").all();
    const out = {};
    rows.forEach(r => out[r.k] = r.v);
    return out;
  },
  setMany(obj) {
    const stmt = db.prepare("INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v");
    Object.entries(obj || {}).forEach(([k,v]) => stmt.run(k, String(v)));
    return this.getAll();
  }
};
