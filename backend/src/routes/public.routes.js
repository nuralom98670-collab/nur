import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";
import { PostController } from "../controllers/post.controller.js";
import { OrderController } from "../controllers/order.controller.js";
import { MessageController } from "../controllers/message.controller.js";
import { SettingsController } from "../controllers/settings.controller.js";
import { CategoryController } from "../controllers/category.controller.js";
import { ServiceItemController } from "../controllers/service_item.controller.js";
import { AppController } from "../controllers/app.controller.js";
import { UploadController } from "../controllers/upload.controller.js";
import { ServiceRequestController } from "../controllers/service_request.controller.js";
import { ReviewController } from "../controllers/review.controller.js";
import { CouponController } from "../controllers/coupon.controller.js";
import { StatsController } from "../controllers/stats.controller.js";
import { uploadImage, uploadAny } from "../config/upload.js";
import { optionalAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";

export const publicRoutes = Router();

// shop/product pages
publicRoutes.get("/products", ProductController.publicList);
publicRoutes.get("/featured", ProductController.publicFeatured);
publicRoutes.get("/products/:id", ProductController.publicGet);

// reviews (public read)
publicRoutes.get("/reviews/:productId", ReviewController.listForProduct);
// homepage testimonials
publicRoutes.get("/home-reviews", ReviewController.listForHome);

// blog pages
publicRoutes.get("/posts", PostController.publicList);
publicRoutes.get("/posts/:id", PostController.publicGet);

// site config + taxonomy
// Public site config (starter video, currency, shipping, payment, etc.)
publicRoutes.get("/site-config", SettingsController.publicGet);

// public KPIs for homepage
publicRoutes.get("/stats", StatsController.publicStats);

// Frontend needs this for Google login button.
publicRoutes.get("/public-config", (req, res) => {
  return res.json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
});

// categories (optional filter): ?kind=shop|blog
publicRoutes.get("/categories", CategoryController.list);

// services + apps
publicRoutes.get("/service-items", ServiceItemController.publicList);
publicRoutes.get("/service-items/:id", ServiceItemController.publicGet);
publicRoutes.get("/apps", AppController.publicList);
publicRoutes.get("/apps/:id", AppController.publicGet);

// public uploads for service requests (no auth)
publicRoutes.post("/upload-image", uploadImage.single("file"), UploadController.single);
publicRoutes.post("/upload-file", uploadAny.single("file"), UploadController.single);

// service request (creates a message in admin inbox)
publicRoutes.post("/service-requests", ServiceRequestController.create);

// checkout (guest allowed, but attaches to user if logged in)
publicRoutes.post("/orders", optionalAuth, OrderController.publicCreate);
// Manual payment checkout requires proof + txn id before creating order
publicRoutes.post("/orders-manual", optionalAuth, uploadImage.single("proof"), OrderController.publicCreateManual);
// coupon validate (used in checkout)
publicRoutes.get("/coupons/validate", CouponController.publicValidate);
// track guest orders
publicRoutes.get("/orders/:id/track", optionalAuth, OrderController.publicTrack);

// contact
publicRoutes.post("/contact", MessageController.publicCreate);
