import { Tag } from "../models/tag.model.js";
export const TagController = {
  list(req,res){ return res.json(Tag.list()); },
  get(req,res){
    const t = Tag.get(req.params.id);
    if(!t) return res.status(404).json({error:"Not found"});
    return res.json(t);
  },
  create(req,res){ return res.json(Tag.create(req.body||{})); },
  update(req,res){
    const t = Tag.update(req.params.id, req.body||{});
    if(!t) return res.status(404).json({error:"Not found"});
    return res.json(t);
  },
  remove(req,res){ Tag.remove(req.params.id); return res.json({ok:true}); }
};
