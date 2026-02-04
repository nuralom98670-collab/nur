import { ServiceItem } from "../models/service_item.model.js";

export const ServiceItemController = {
  adminList(req,res){ return res.json(ServiceItem.list()); },
  adminGet(req,res){
    const s = ServiceItem.get(req.params.id);
    if(!s) return res.status(404).json({error:"Not found"});
    return res.json(s);
  },
  adminCreate(req,res){ return res.json(ServiceItem.create(req.body||{})); },
  adminUpdate(req,res){
    const s = ServiceItem.update(req.params.id, req.body||{});
    if(!s) return res.status(404).json({error:"Not found"});
    return res.json(s);
  },
  adminDelete(req,res){ ServiceItem.remove(req.params.id); return res.json({ok:true}); },

  publicList(req,res){ return res.json(ServiceItem.list()); },
  publicGet(req,res){
    const s = ServiceItem.get(req.params.id);
    if(!s) return res.status(404).json({error:"Not found"});
    return res.json(s);
  }
};
