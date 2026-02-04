import { Category } from "../models/category.model.js";
export const CategoryController = {
  list(req,res){
    const kind = req.query.kind || null;
    return res.json(Category.list(kind));
  },
  create(req,res){ return res.json(Category.create(req.body||{})); },
  remove(req,res){ Category.remove(req.params.id); return res.json({ok:true}); }
};
