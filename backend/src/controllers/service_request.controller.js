import { db, nowISO } from "../db/index.js";
import { ServiceItem } from "../models/service_item.model.js";

function uid(prefix="req"){ return prefix+"_"+Date.now()+"_"+Math.random().toString(16).slice(2); }

export const ServiceRequestController = {
  create(req,res){
    const { serviceId, name, phone, email, note, filesJson, imagesJson } = req.body || {};
    const svc = serviceId ? ServiceItem.get(serviceId) : null;
    if (!svc) return res.status(400).json({ error: "Invalid service" });

    const id = uid("msg");
    const createdAt = nowISO();
    const subject = `Service Request: ${svc.title}`;
    const payload = {
      serviceId: svc.id,
      serviceTitle: svc.title,
      name: name || "",
      phone: phone || "",
      email: email || "",
      note: note || "",
      files: (()=>{ try { return JSON.parse(filesJson||"[]"); } catch { return []; } })(),
      images: (()=>{ try { return JSON.parse(imagesJson||"[]"); } catch { return []; } })()
    };

    db.prepare(`INSERT INTO messages (id,name,email,subject,message,isRead,createdAt)
                VALUES (?,?,?,?,?,?,?)`).run(
      id,
      payload.name,
      payload.email,
      subject,
      JSON.stringify(payload),
      0,
      createdAt
    );

    return res.json({ ok: true, id });
  }
};
