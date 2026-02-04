import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/user.model.js";

export function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    // Support cookie-based sessions as well (more robust than localStorage).
    const cookieToken = req.cookies?.rl_token || null;
    const finalToken = token || cookieToken;
    if (!finalToken) return res.status(401).json({ error: "Unauthorized" });

    const payload = verifyToken(finalToken);
    const user = User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Same as auth, but does not fail if no token is provided.
export function optionalAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    const cookieToken = req.cookies?.rl_token || null;
    const finalToken = token || cookieToken;
    if (!finalToken) return next();
    const payload = verifyToken(finalToken);
    const user = User.findById(payload.id);
    if (user) req.user = user;
    return next();
  } catch {
    return next();
  }
}
