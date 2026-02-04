PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'shop', -- shop | blog
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  categoryKey TEXT,
  categoryLabel TEXT,
  categoriesJson TEXT,
  price REAL NOT NULL DEFAULT 0,
  discountPrice REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  desc TEXT,
  imageUrl TEXT,
  imagesJson TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  coverImageUrl TEXT,
  videoUrl TEXT,
  imagesJson TEXT,
  categoryKey TEXT,
  categoryLabel TEXT,
  metaTitle TEXT,
  metaDescription TEXT,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  userId TEXT,
  guestToken TEXT,
  customerJson TEXT NOT NULL,
  itemsJson TEXT NOT NULL,
  subtotal REAL,
  discount REAL NOT NULL DEFAULT 0,
  couponCode TEXT,
  shipping REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  paymentMethod TEXT NOT NULL DEFAULT 'cod',
  paymentStatus TEXT NOT NULL DEFAULT 'not_required', -- not_required | unpaid | submitted | verified | rejected
  paymentProvider TEXT,
  paymentTxnId TEXT,
  paymentSender TEXT,
  paymentAmount REAL,
  paymentProof TEXT,
  paymentSubmittedAt TEXT,
  paymentReviewedAt TEXT,
  paymentReviewNote TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | processing | shipped | delivered | cancelled | refunded
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  productId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(userId, productId)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  userId TEXT,
  name TEXT,
  rating INTEGER NOT NULL,
  body TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  isRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
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
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok', -- ok | down
  lastRestartAt TEXT
);

CREATE TABLE IF NOT EXISTS service_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  apkUrl TEXT,
  imagesJson TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS user_events (
  id TEXT PRIMARY KEY,
  userId TEXT,
  email TEXT,
  type TEXT NOT NULL, -- register | login
  ip TEXT,
  userAgent TEXT,
  createdAt TEXT NOT NULL
);
