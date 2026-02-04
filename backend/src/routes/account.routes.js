import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { AccountController } from "../controllers/account.controller.js";
import { ReviewController } from "../controllers/review.controller.js";

export const accountRoutes = Router();

accountRoutes.use(auth);

accountRoutes.get("/orders", AccountController.myOrders);

// Allow customers to cancel shortly after ordering
accountRoutes.post("/orders/:id/cancel", AccountController.cancelOrder);

// Manual payment: submit transaction info + screenshot proof
accountRoutes.post("/orders/:id/payment-proof", AccountController.submitPaymentProof);

accountRoutes.get("/wishlist", AccountController.myWishlist);
accountRoutes.post("/wishlist/add", AccountController.addWishlist);
accountRoutes.post("/wishlist/remove", AccountController.removeWishlist);

// Reviews (requires login for posting)
accountRoutes.post("/reviews", ReviewController.create);
accountRoutes.get("/reviews", AccountController.myReviews);

// Notifications
accountRoutes.get("/notifications", AccountController.myNotifications);
accountRoutes.get("/notifications/unread-count", AccountController.notificationsUnreadCount);
accountRoutes.post("/notifications/mark-read", AccountController.markNotificationsRead);
