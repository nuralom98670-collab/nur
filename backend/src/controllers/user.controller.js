import { db } from "../db/index.js";

export const UserController = {
  list(req,res){
    const rows = db.prepare("SELECT id,name,email,role,createdAt,lastLoginAt FROM users WHERE role='customer' ORDER BY createdAt DESC").all();
    res.json(rows);
  },
  get(req,res){
    const u = db.prepare("SELECT id,name,email,role,createdAt,lastLoginAt FROM users WHERE role='customer' WHERE id=?").get(req.params.id);
    if(!u) return res.status(404).json({error:"Not found"});
    res.json(u);
  }
};
