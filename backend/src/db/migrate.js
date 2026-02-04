import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, "schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");

db.exec(sql);

// Lightweight forward-compatible migrations for existing databases.
function hasColumn(table, col) {
  try {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    return info.some(r => r.name === col);
  } catch {
    return false;
  }
}

function ensureColumn(table, col, defSql) {
  if (hasColumn(table, col)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${defSql}`);
  console.log(`✅ Added column ${table}.${col}`);
}

// New fields needed by blog categories + checkout improvements
ensureColumn("categories", "kind", "kind TEXT NOT NULL DEFAULT 'shop'"); // shop | blog
ensureColumn("posts", "categoryKey", "categoryKey TEXT");
ensureColumn("posts", "categoryLabel", "categoryLabel TEXT");
ensureColumn("orders", "shipping", "shipping REAL NOT NULL DEFAULT 0");
ensureColumn("orders", "paymentMethod", "paymentMethod TEXT NOT NULL DEFAULT 'cod'");
ensureColumn("orders", "userId", "userId TEXT");
// Guest checkout: allow tracking guest orders securely
ensureColumn("orders", "guestToken", "guestToken TEXT");
// Product gallery + SEO fields
ensureColumn("products", "imagesJson", "imagesJson TEXT");
// Discount price for products (sale price)
ensureColumn("products", "discountPrice", "discountPrice REAL NOT NULL DEFAULT 0");
// Multi-category support for products (store JSON array of {key,label})
ensureColumn("products", "categoriesJson", "categoriesJson TEXT");
ensureColumn("posts", "metaTitle", "metaTitle TEXT");
ensureColumn("posts", "metaDescription", "metaDescription TEXT");
ensureColumn("posts", "slug", "slug TEXT");
ensureColumn("posts", "imagesJson", "imagesJson TEXT"); // Blog multiple images gallery
// Blog video embed (YouTube/Facebook/Vimeo URL)
ensureColumn("posts", "videoUrl", "videoUrl TEXT");

// Services marketplace fields
ensureColumn("service_items", "imageUrl", "imageUrl TEXT");
ensureColumn("service_items", "galleryJson", "galleryJson TEXT");
ensureColumn("service_items", "needsFiles", "needsFiles INTEGER NOT NULL DEFAULT 0");
ensureColumn("service_items", "filesHint", "filesHint TEXT");

// Apps: keep imagesJson + apkUrl already in schema; nothing extra for now

ensureColumn("orders", "cancelledAt", "cancelledAt TEXT");

ensureColumn("orders", "cancelReason", "cancelReason TEXT");

ensureColumn("orders", "refundStatus", "refundStatus TEXT NOT NULL DEFAULT 'none'");

// New tables for e-commerce features
db.exec(`CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  productId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(userId, productId)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  userId TEXT,
  name TEXT,
  rating INTEGER NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | hidden
  adminNote TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)`);

// Order timeline events
db.exec(`CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  actor TEXT, -- admin | system | user
  createdAt TEXT NOT NULL
)`);

// User notifications (dashboard bell)
db.exec(`CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL, -- order | review | system
  title TEXT NOT NULL,
  body TEXT,
  isRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
)`);

// Admin notifications (new orders/messages/payment proofs)
db.exec(`CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- order | message | payment | system
  title TEXT NOT NULL,
  body TEXT,
  refType TEXT, -- order | message | ...
  refId TEXT,
  isRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
)`);

console.log("✅ Migration done");

// Users: track last login
ensureColumn("users", "lastLoginAt", "lastLoginAt TEXT");

// Customer profile fields
ensureColumn("users", "phone", "phone TEXT");
ensureColumn("users", "address", "address TEXT");

// Orders: admin internal notes
ensureColumn("orders", "adminNote", "adminNote TEXT");

// Orders: coupon/discount fields (safe to add for existing DBs)
ensureColumn("orders", "subtotal", "subtotal REAL");
ensureColumn("orders", "discount", "discount REAL NOT NULL DEFAULT 0");
ensureColumn("orders", "couponCode", "couponCode TEXT");

// Manual payment proof flow (COD + bKash/Nagad/Rocket)
ensureColumn("orders", "paymentStatus", "paymentStatus TEXT NOT NULL DEFAULT 'not_required'");
ensureColumn("orders", "paymentProvider", "paymentProvider TEXT");
ensureColumn("orders", "paymentTxnId", "paymentTxnId TEXT");
ensureColumn("orders", "paymentSender", "paymentSender TEXT");
ensureColumn("orders", "paymentAmount", "paymentAmount REAL");
ensureColumn("orders", "paymentProof", "paymentProof TEXT");
ensureColumn("orders", "paymentSubmittedAt", "paymentSubmittedAt TEXT");
ensureColumn("orders", "paymentReviewedAt", "paymentReviewedAt TEXT");
ensureColumn("orders", "paymentReviewNote", "paymentReviewNote TEXT");

// Coupons (admin managed)
db.exec(`CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percent', -- percent | flat
  value REAL NOT NULL DEFAULT 0,
  minSubtotal REAL NOT NULL DEFAULT 0,
  maxDiscount REAL,
  active INTEGER NOT NULL DEFAULT 1,
  expiresAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)`);

// Reviews moderation columns for existing DBs
ensureColumn("reviews", "status", "status TEXT NOT NULL DEFAULT 'pending'");
ensureColumn("reviews", "adminNote", "adminNote TEXT");
ensureColumn("reviews", "updatedAt", "updatedAt TEXT");


// Message replies (admin can reply to contact messages)
db.exec(`CREATE TABLE IF NOT EXISTS message_replies (
  id TEXT PRIMARY KEY,
  messageId TEXT NOT NULL,
  adminId TEXT,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL
)`);
