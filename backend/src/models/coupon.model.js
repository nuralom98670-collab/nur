import { db, nowISO } from "../db/index.js";

function uid(prefix="cpn"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const Coupon = {
  list(){
    return db.prepare("SELECT * FROM coupons ORDER BY createdAt DESC").all();
  },
  getByCode(code){
    const c = String(code||"").trim().toUpperCase();
    if(!c) return null;
    return db.prepare("SELECT * FROM coupons WHERE code=?").get(c);
  },
  get(id){
    return db.prepare("SELECT * FROM coupons WHERE id=?").get(id);
  },
  create({ code, type='percent', value=0, minSubtotal=0, maxDiscount=null, active=1, expiresAt=null }){
    const id = uid();
    const createdAt = nowISO();
    const updatedAt = createdAt;
    const c = String(code||"").trim().toUpperCase();
    if(!c) return { error: "Code is required" };
    const t = String(type||'percent').toLowerCase();
    if(!['percent','flat'].includes(t)) return { error: "Invalid type" };
    const v = Number(value||0);
    if(!isFinite(v) || v <= 0) return { error: "Value must be > 0" };
    const ms = Math.max(0, Number(minSubtotal||0));
    const md = (maxDiscount==null || maxDiscount==='') ? null : Number(maxDiscount);
    const act = Number(active)?1:0;
    try{
      db.prepare(`
        INSERT INTO coupons (id,code,type,value,minSubtotal,maxDiscount,active,expiresAt,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(id, c, t, v, ms, md, act, expiresAt || null, createdAt, updatedAt);
      return this.get(id);
    }catch(e){
      if(String(e?.message||"").toLowerCase().includes('unique')) return { error: "Coupon code already exists" };
      return { error: "Failed to create coupon" };
    }
  },
  remove(id){
    const c = this.get(id); if(!c) return null;
    db.prepare("DELETE FROM coupons WHERE id=?").run(id);
    return c;
  }
};
