import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";

import { ProductController } from "../controllers/product.controller.js";
import { PostController } from "../controllers/post.controller.js";
import { CategoryController } from "../controllers/category.controller.js";
import { TagController } from "../controllers/tag.controller.js";
import { OrderController } from "../controllers/order.controller.js";
import { ReviewController } from "../controllers/review.controller.js";
import { MessageController } from "../controllers/message.controller.js";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { SettingsController } from "../controllers/settings.controller.js";
import { ServiceController } from "../controllers/service.controller.js";
import { ServiceItemController } from "../controllers/service_item.controller.js";
import { AppController } from "../controllers/app.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { UploadController } from "../controllers/upload.controller.js";
import { CouponController } from "../controllers/coupon.controller.js";
import { AdminNotificationController } from "../controllers/admin_notification.controller.js";
import { uploadImage, uploadAny } from "../config/upload.js";

export const adminRoutes = Router();

adminRoutes.use(auth, adminOnly);

// uploads (multipart/form-data)
adminRoutes.post("/upload-image", uploadImage.single("file"), UploadController.single);
adminRoutes.post("/upload-file", uploadAny.single("file"), UploadController.single);

// dashboard
adminRoutes.get("/dashboard/summary", DashboardController.summary);
adminRoutes.get("/dashboard/login-events", DashboardController.loginEvents);
adminRoutes.get("/dashboard/low-stock", DashboardController.lowStock);
adminRoutes.get("/dashboard/new-orders", DashboardController.newOrders);

// notifications (admin inbox)
adminRoutes.get("/notifications/count", AdminNotificationController.count);
adminRoutes.get("/notifications", AdminNotificationController.list);
adminRoutes.put("/notifications/read", AdminNotificationController.markRead);

// products CRUD
adminRoutes.get("/products", ProductController.adminList);
adminRoutes.post("/products", ProductController.adminCreate);
// products create with multipart images in one request (more reliable than separate upload calls)
adminRoutes.post(
  "/products-multipart",
  uploadImage.array("images", 10),
  ProductController.adminCreateMultipart
);
adminRoutes.get("/products/:id", ProductController.adminGet);
adminRoutes.put("/products/:id", ProductController.adminUpdate);
adminRoutes.delete("/products/:id", ProductController.adminDelete);

// posts CRUD
adminRoutes.get("/posts", PostController.adminList);
adminRoutes.post("/posts", PostController.adminCreate);
// posts create/update with cover + gallery images in one request (same style as product multipart)
adminRoutes.post(
  "/posts-multipart",
  uploadImage.fields([
    { name: "cover", maxCount: 1 },
    { name: "images", maxCount: 20 }
  ]),
  PostController.adminCreateMultipart
);
adminRoutes.put(
  "/posts/:id-multipart",
  uploadImage.fields([
    { name: "cover", maxCount: 1 },
    { name: "images", maxCount: 20 }
  ]),
  PostController.adminUpdateMultipart
);
adminRoutes.get("/posts/:id", PostController.adminGet);
adminRoutes.put("/posts/:id", PostController.adminUpdate);
adminRoutes.delete("/posts/:id", PostController.adminDelete);

// categories (your dashboard page uses list + delete)
adminRoutes.get("/categories", CategoryController.list);
adminRoutes.post("/categories", CategoryController.create);
adminRoutes.delete("/categories/:id", CategoryController.remove);

// tags (dashboard has new/edit/delete)
adminRoutes.get("/tags", TagController.list);
adminRoutes.post("/tags", TagController.create);
adminRoutes.get("/tags/:id", TagController.get);
adminRoutes.put("/tags/:id", TagController.update);
adminRoutes.delete("/tags/:id", TagController.remove);

// orders
adminRoutes.get("/orders", OrderController.adminList);
adminRoutes.get("/orders/:id", OrderController.adminGet);
adminRoutes.put("/orders/:id/paid", OrderController.markPaid);
adminRoutes.put("/orders/:id/shipped", OrderController.markShipped);
adminRoutes.put("/orders/:id/status", OrderController.updateStatus);
adminRoutes.put("/orders/:id/note", OrderController.updateAdminNote);

// Manual payment review
adminRoutes.put("/orders/:id/payment/approve", OrderController.approvePayment);
adminRoutes.put("/orders/:id/payment/reject", OrderController.rejectPayment);


// reviews
adminRoutes.get("/reviews", ReviewController.adminList);
adminRoutes.put("/reviews/:id/status", ReviewController.adminUpdateStatus);
adminRoutes.delete("/reviews/:id", ReviewController.adminDelete);

// messages
adminRoutes.get("/messages", MessageController.adminList);
adminRoutes.get("/service-requests", MessageController.serviceRequests);
adminRoutes.get("/messages/:id", MessageController.adminGet);
adminRoutes.put("/messages/:id/read", MessageController.markRead);
adminRoutes.get("/messages/:id/replies", MessageController.adminReplies);
adminRoutes.post("/messages/:id/replies", MessageController.adminReplyCreate);

// settings
adminRoutes.get("/settings", SettingsController.get);
adminRoutes.put("/settings", SettingsController.update);

// coupons
adminRoutes.get("/coupons", CouponController.adminList);
adminRoutes.post("/coupons", CouponController.adminCreate);
adminRoutes.delete("/coupons/:id", CouponController.adminDelete);

// services
adminRoutes.get("/services", ServiceController.list);
adminRoutes.get("/services/:id", ServiceController.get);
adminRoutes.post("/services/:id/restart", ServiceController.restart);


// service offerings (what you sell)
adminRoutes.get("/service-items", ServiceItemController.adminList);
adminRoutes.post("/service-items", ServiceItemController.adminCreate);
adminRoutes.get("/service-items/:id", ServiceItemController.adminGet);
adminRoutes.put("/service-items/:id", ServiceItemController.adminUpdate);
adminRoutes.delete("/service-items/:id", ServiceItemController.adminDelete);

// apps
adminRoutes.get("/apps", AppController.adminList);
adminRoutes.post("/apps", AppController.adminCreate);
adminRoutes.get("/apps/:id", AppController.adminGet);
adminRoutes.put("/apps/:id", AppController.adminUpdate);
adminRoutes.delete("/apps/:id", AppController.adminDelete);

// users
adminRoutes.get("/users", UserController.list);
adminRoutes.get("/users/:id", UserController.get);
