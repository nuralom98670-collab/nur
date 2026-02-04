import { Product } from "../models/product.model.js";

function withParsed(p){
  const images = (()=>{ try { return JSON.parse(p.imagesJson||"[]"); } catch { return []; } })();
  const categories = (()=>{ try { return JSON.parse(p.categoriesJson||"[]"); } catch { return []; } })();
  return { ...p, images, categories };
}


export const ProductController = {
  adminList(req,res){ return res.json(Product.list().map(withParsed)); },
  adminGet(req,res){
    const p = Product.get(req.params.id);
    if(!p) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(p));
  },
  adminCreate(req,res){ return res.json(withParsed(Product.create(req.body||{}))); },

  // Create product with multipart images in a single request.
  // Expects fields in req.body and files in req.files (array).
  adminCreateMultipart(req, res) {
    const body = req.body || {};
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length) {
      const urls = files.map(f => `/uploads/${f.filename}`);
      // Always persist the full gallery in the same order as uploaded
      body.imagesJson = JSON.stringify(urls);
      // Keep provided imageUrl only if it's one of uploaded urls; otherwise use first
      if (!body.imageUrl || !urls.includes(String(body.imageUrl))) {
        body.imageUrl = urls[0];
      }
    }
    // numeric coercion
    body.price = Number(body.price || 0);
    body.discountPrice = Number(body.discountPrice || 0);
    body.stock = Number(body.stock || 0);
    return res.json(withParsed(Product.create(body)));
  },
  adminUpdate(req,res){
    const p = Product.update(req.params.id, req.body||{});
    if(!p) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(p));
  },
  adminDelete(req,res){ Product.remove(req.params.id); return res.json({ok:true}); },

  publicList(req,res){
    const key = String(req.query.categoryKey || "").trim();
    const items = Product.list().map(withParsed);
    if (!key) return res.json(items);
    const filtered = items.filter(p => {
      if (p.categoryKey === key) return true;
      const cats = Array.isArray(p.categories) ? p.categories : [];
      return cats.some(c => c?.key === key);
    });
    return res.json(filtered);
  },

  publicFeatured(req,res){
    // simple: show latest 3 products
    const items = Product.list().slice(0, 3);
    return res.json(items.map(withParsed));
  },

  publicGet(req,res){
    const p = Product.get(req.params.id);
    if(!p) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(p));
  }
};
