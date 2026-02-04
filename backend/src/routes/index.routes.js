import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { publicRoutes } from "./public.routes.js";
import { adminRoutes } from "./admin.routes.js";
import { accountRoutes } from "./account.routes.js";
import { env } from "../config/env.js";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/public", publicRoutes);
routes.use("/admin", adminRoutes);
routes.use("/account", accountRoutes);

// Alias for legacy frontend path
routes.get("/public-config", (req, res) => {
  return res.json({ googleClientId: env.GOOGLE_CLIENT_ID || "" });
});

routes.get("/health", (req,res)=>res.json({ ok:true }));
