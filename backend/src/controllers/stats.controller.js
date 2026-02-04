import { db } from "../db/index.js";

function parseJson(str, fallback){
  try { return JSON.parse(str || ""); } catch { return fallback; }
}

export const StatsController = {
  publicStats(req, res){
    const productCount = Number(db.prepare("SELECT COUNT(*) as c FROM products").get()?.c || 0);
    const inStock = Number(db.prepare("SELECT COALESCE(SUM(stock),0) as s FROM products").get()?.s || 0);

    // Sold pieces: count only delivered orders (so it doesn't inflate).
    const rows = db.prepare("SELECT itemsJson FROM orders WHERE LOWER(status)=LOWER('delivered')").all();
    let soldPieces = 0;
    for(const r of rows){
      const items = parseJson(r?.itemsJson, []);
      for(const it of (Array.isArray(items) ? items : [])){
        soldPieces += Number(it?.qty || 1);
      }
    }

    return res.json({ productCount, inStock, soldPieces });
  }
};
