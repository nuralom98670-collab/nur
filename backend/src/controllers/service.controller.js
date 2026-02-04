import { Service } from "../models/service.model.js";
export const ServiceController = {
  list(req,res){ return res.json(Service.list()); },
  get(req,res){
    const s = Service.get(req.params.id);
    if(!s) return res.status(404).json({error:"Not found"});
    return res.json(s);
  },
  restart(req,res){
    const s = Service.restart(req.params.id);
    if(!s) return res.status(404).json({error:"Not found"});
    return res.json({ ok:true, service: s });
  }
};
