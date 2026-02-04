import path from "path";
import { fileURLToPath } from "url";
import express from "express";

import { env } from "./config/env.js";
import { verifyToken } from "./utils/jwt.js";
import { User } from "./models/user.model.js";
import { createApp } from "./app.js";
import "./db/migrate.js";
// Seed default data (admin user, default categories, etc.)
import "./db/seed.js";
import { ensureUploadDir, UPLOAD_DIR } from "./config/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");

const app = createApp();

// ---- Protect customer dashboard pages (no guest dashboard access) ----
function requireCustomerAuth(req, res, next) {
  try {
    const token = req.cookies?.rl_token || null;
    if (!token) {
      return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || "/account")}`);
    }
    const payload = verifyToken(token);
    const user = payload?.id ? User.findById(payload.id) : null;
    if (!user) {
      res.clearCookie("rl_token");
      return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || "/account")}`);
    }
    // Prevent admin session cookies from leaking into customer dashboard
    if (String(user.role || '').toLowerCase() === 'admin') {
      res.clearCookie("rl_token");
      return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || "/account")}`);
    }
    // Attach for potential use (optional)
    req.user = user;
    return next();
  } catch (e) {
    res.clearCookie("rl_token");
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || "/account")}`);
  }
}

// Block direct access to raw dashboard HTML files (served by express.static)
const PROTECTED_STATIC_FILES = new Set([
  "/account.html",
  "/account-overview.html",
  "/account-orders.html",
  "/account-reviews.html",
  "/account-profile.html"
]);


// Serve uploaded files
ensureUploadDir();
app.use("/uploads", express.static(UPLOAD_DIR));

// Serve frontend static


// Guard raw HTML dashboard files before static middleware
app.use((req, res, next) => {
  if (PROTECTED_STATIC_FILES.has(req.path)) {
    // Route through /account which is protected
    return res.redirect("/account");
  }
  return next();
});
app.use(express.static(FRONTEND_DIR));

// Friendly routes
// Friendly routes (extensionless URLs)
// Public pages
app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
app.get("/index", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
app.get("/about", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "about.html")));
app.get("/shop", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "shop.html")));
app.get("/product", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "product.html")));
app.get("/cart", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "cart.html")));
app.get("/checkout", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "checkout.html")));
app.get("/blog", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "blog.html")));
app.get("/blog-post", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "blog-post.html")));
app.get("/services", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "services.html")));
app.get("/service-detail", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "service-detail.html")));
app.get("/apps", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "apps.html")));
app.get("/account", requireCustomerAuth, (req, res) => res.sendFile(path.join(FRONTEND_DIR, "account.html")));
// Separate dashboard pages (same logic, different default tab)
app.get("/account/overview", requireCustomerAuth, (req, res) => res.sendFile(path.join(FRONTEND_DIR, "account-overview.html")));
app.get("/account/orders", requireCustomerAuth, (req, res) => res.sendFile(path.join(FRONTEND_DIR, "account-orders.html")));
app.get("/account/reviews", requireCustomerAuth, (req, res) => res.sendFile(path.join(FRONTEND_DIR, "account-reviews.html")));
app.get("/account/profile", requireCustomerAuth, (req, res) => res.sendFile(path.join(FRONTEND_DIR, "account-profile.html")));
app.get("/login", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "login.html")));
app.get("/contact", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "contact.html")));

// Admin pages
app.get("/admin", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "login.html")));
app.get("/admin/login", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "login.html")));
app.get("/admin/dashboard", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "dashboard.html")));
app.get("/admin/products", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "products.html")));
app.get("/admin/product-new", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "product-new.html")));
app.get("/admin/product-edit", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "product-edit.html")));
app.get("/admin/posts", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "posts.html")));
app.get("/admin/post-new", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "post-new.html")));
app.get("/admin/post-edit", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "post-edit.html")));
app.get("/admin/categories", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "categories.html")));
app.get("/admin/tags", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "tags.html")));
app.get("/admin/tag-new", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "tag-new.html")));
app.get("/admin/tag-edit", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "tag-edit.html")));
app.get("/admin/orders", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "orders.html")));
app.get("/admin/reviews", (req, res) =>
  res.sendFile(path.join(FRONTEND_DIR, "admin", "reviews.html"))
);
app.get("/admin/order-view", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "order-view.html")));
app.get("/admin/messages", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "messages.html")));
app.get("/admin/message-view", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "message-view.html")));
app.get("/admin/services", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "services.html")));
app.get("/admin/service-items", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "service-items.html")));
app.get("/admin/apps", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "apps.html")));
app.get("/admin/service-view", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "service-view.html")));
app.get("/admin/users", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "users.html")));
app.get("/admin/user-view", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "user-view.html")));
app.get("/admin/profile", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "profile.html")));
app.get("/admin/settings", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "admin", "settings.html")));


// Fallback (not /api)
app.get("*", (req, res, next) => {
  // Never rewrite API/static asset paths to index.html.
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/assets") ||
    req.path.startsWith("/uploads")
  ) {
    return next();
  }
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});


// ---------------- Start server ----------------
app.listen(env.PORT, () => {
  // Keep logs plain ASCII (avoids copy/paste encoding issues on Windows terminals)
  console.log("Server running: http://localhost:" + env.PORT);
  console.log("Site:          http://localhost:" + env.PORT + "/");
  console.log("Admin:         http://localhost:" + env.PORT + "/admin");
  console.log("API Health:    http://localhost:" + env.PORT + "/api/health");
});
