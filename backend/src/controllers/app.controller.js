import { AppItem } from "../models/app.model.js";

function withParsed(a){
  const images = (() => {
    try { return JSON.parse(a.imagesJson || "[]"); } catch { return []; }
  })();
  return { ...a, images };
}

export const AppController = {
  adminList(req,res){ return res.json(AppItem.list().map(withParsed)); },
  adminGet(req,res){
    const a = AppItem.get(req.params.id);
    if(!a) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(a));
  },
  adminCreate(req,res){ return res.json(withParsed(AppItem.create(req.body||{}))); },
  adminUpdate(req,res){
    const a = AppItem.update(req.params.id, req.body||{});
    if(!a) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(a));
  },
  adminDelete(req,res){ AppItem.remove(req.params.id); return res.json({ok:true}); },

  publicList(req,res){ return res.json(AppItem.list().map(withParsed)); },
  publicGet(req,res){
    const a = AppItem.get(req.params.id);
    if(!a) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(a));
  }
};
