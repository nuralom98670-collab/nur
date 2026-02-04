import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/login", AuthController.login);
authRoutes.post("/register", AuthController.register);
authRoutes.post("/google", AuthController.google);
authRoutes.post("/logout", AuthController.logout);
authRoutes.get("/me", auth, AuthController.me);
authRoutes.put("/me", auth, AuthController.updateMe);
