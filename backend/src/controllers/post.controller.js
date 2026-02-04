import { Post } from "../models/post.model.js";

function withParsed(p){
  const images = (()=>{try{return JSON.parse(p.imagesJson||"[]");}catch{return []}})();
  return {...p, images};
}

export const PostController = {
  adminList(req,res){ return res.json(Post.listAdmin().map(withParsed)); },
  adminGet(req,res){
    const p = Post.get(req.params.id);
    if(!p) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(p));
  },
  // Create post with cover + multiple images in a single multipart request.
  // Fields are in req.body, files are in req.files (fields: cover, images)
  adminCreateMultipart(req, res) {
    const body = req.body || {};
    const files = req.files || {};
    const cover = Array.isArray(files.cover) ? files.cover[0] : null;
    const images = Array.isArray(files.images) ? files.images : [];

    if (cover) body.coverImageUrl = `/uploads/${cover.filename}`;
    let urls = [];
    if (images.length) {
      urls = images.map(f => `/uploads/${f.filename}`);
      body.imagesJson = JSON.stringify(urls);
    }

    // If admin inserted placeholders like {{UPLOAD:0}} in the body, resolve them to real URLs.
    if (urls.length && typeof body.body === "string" && body.body.includes("{{UPLOAD:")) {
      body.body = body.body.replace(/\{\{UPLOAD:(\d+)\}\}/g, (m, n) => {
        const i = Number(n);
        return Number.isFinite(i) && urls[i] ? urls[i] : m;
      });
    }

    return res.json(withParsed(Post.create(body)));
  },
  // Update post with multipart (optional cover/images)
  adminUpdateMultipart(req, res) {
    const body = req.body || {};
    const files = req.files || {};
    const cover = Array.isArray(files.cover) ? files.cover[0] : null;
    const images = Array.isArray(files.images) ? files.images : [];

    if (cover) body.coverImageUrl = `/uploads/${cover.filename}`;
    let urls = [];
    if (images.length) {
      urls = images.map(f => `/uploads/${f.filename}`);
      body.imagesJson = JSON.stringify(urls);
    }

    if (urls.length && typeof body.body === "string" && body.body.includes("{{UPLOAD:")) {
      body.body = body.body.replace(/\{\{UPLOAD:(\d+)\}\}/g, (m, n) => {
        const i = Number(n);
        return Number.isFinite(i) && urls[i] ? urls[i] : m;
      });
    }

    const p = Post.update(req.params.id, body);
    if (!p) return res.status(404).json({ error: "Not found" });
    return res.json(withParsed(p));
  },
  adminCreate(req,res){ return res.json(withParsed(Post.create(req.body||{}))); },
  adminUpdate(req,res){
    const p = Post.update(req.params.id, req.body||{});
    if(!p) return res.status(404).json({error:"Not found"});
    return res.json(withParsed(p));
  },
  adminDelete(req,res){ Post.remove(req.params.id); return res.json({ok:true}); },

  publicList(req,res){
    const categoryKey = req.query.categoryKey || null;
    const items = Post.listPublished(categoryKey).map(withParsed);
    return res.json({ items }); // blog.js expects {items}
  },
  publicGet(req,res){
    const p = Post.get(req.params.id);
    if(!p || p.status!=="published") return res.status(404).json({error:"Not found"});
    return res.json(withParsed(p));
  }
};
