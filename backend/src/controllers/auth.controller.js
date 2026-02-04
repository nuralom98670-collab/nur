import { User } from "../models/user.model.js";
import { verifyPassword, hashPassword } from "../utils/password.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { db, nowISO } from "../db/index.js";
import { UserEvent } from "../models/user_event.model.js";
import { env } from "../config/env.js";
import { OAuth2Client } from "google-auth-library";

function uid(prefix = "u") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const googleClient = new OAuth2Client();

function setSessionCookie(res, token) {
  // HttpOnly cookie so browser sends it automatically
  res.cookie("rl_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });
}

function clearSessionCookie(res) {
  res.cookie("rl_token", "", { httpOnly: true, sameSite: "lax", maxAge: 0 });
}

function getTokenFromReq(req) {
  // IMPORTANT:
  // We support BOTH httpOnly cookie sessions and Authorization: Bearer tokens.
  // Because admin and customer can be logged in on the same browser,
  // we MUST prioritize the explicit Bearer token when it exists.
  // Otherwise, the cookie could "win" and show admin info in user dashboard.
  const h = req.get("authorization") || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return req.cookies?.rl_token;
}

function safeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name || "",
    email: u.email || "",
    role: u.role || "customer",
    phone: u.phone || "",
    address: u.address || "",
    createdAt: u.createdAt || null,
    lastLoginAt: u.lastLoginAt || null
  };
}

function getAuthedUser(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;

  const payload = verifyToken(token); // throws if invalid
  if (!payload?.id) return null;

  const u = User.findById(payload.id);
  return u || null;
}

export const AuthController = {
  register(req, res) {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const normEmail = String(email).toLowerCase().trim();
    const exists = User.findByEmail(normEmail);
    if (exists) return res.status(409).json({ error: "Email already used" });

    const id = uid("u");
    const passwordHash = hashPassword(password);

    db.prepare("INSERT INTO users (id,name,email,passwordHash,role,createdAt) VALUES (?,?,?,?,?,?)")
      .run(id, name || null, normEmail, passwordHash, "customer", nowISO());

    // audit
    UserEvent.log({
      userId: id,
      email: normEmail,
      type: "register",
      ip: req.ip,
      userAgent: req.get("user-agent")
    });

    const token = signToken({ id, role: "customer" });
    setSessionCookie(res, token);

    return res.json({ token, user: safeUser(User.findById(id)) });
  },

  login(req, res) {
    const { email, password } = req.body || {};
    const normEmail = String(email || "").toLowerCase().trim();
    const u = User.findByEmail(normEmail);
    if (!u) return res.status(401).json({ error: "Invalid credentials" });

    const ok = verifyPassword(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    db.prepare("UPDATE users SET lastLoginAt=? WHERE id=?").run(nowISO(), u.id);

    // audit
    UserEvent.log({
      userId: u.id,
      email: String(u.email || normEmail || "").toLowerCase().trim(),
      type: "login",
      ip: req.ip,
      userAgent: req.get("user-agent")
    });

    const token = signToken({ id: u.id, role: u.role });
    setSessionCookie(res, token);

    return res.json({ token, user: safeUser(User.findById(u.id)) });
  },

  async google(req, res) {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: "Google credential required" });

    if (!env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        error: "Google login is not configured. Set GOOGLE_CLIENT_ID in backend .env"
      });
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const email = String(payload?.email || "").toLowerCase().trim();
      const name = payload?.name || payload?.given_name || "User";
      if (!email) return res.status(401).json({ error: "Google login failed" });

      let user = User.findByEmail(email);

      if (!user) {
        const id = uid("u");
        db.prepare("INSERT INTO users (id,name,email,passwordHash,role,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?,?)")
          .run(id, name, email, "", "customer", nowISO(), nowISO());

        UserEvent.log({
          userId: id,
          email,
          type: "register_google",
          ip: req.ip,
          userAgent: req.get("user-agent")
        });

        user = User.findById(id);
      } else {
        db.prepare("UPDATE users SET lastLoginAt=? WHERE id=?").run(nowISO(), user.id);

        UserEvent.log({
          userId: user.id,
          email,
          type: "login_google",
          ip: req.ip,
          userAgent: req.get("user-agent")
        });
      }

      const token = signToken({ id: user.id, role: user.role || "customer" });
      setSessionCookie(res, token);

      return res.json({ token, user: safeUser(user) });
    } catch (e) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
  },

  logout(req, res) {
    clearSessionCookie(res);
    return res.json({ ok: true });
  },

  // ✅ me returns real user (cookie or bearer token)
  me(req, res) {
    try {
      const user = getAuthedUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      return res.json(safeUser(user));
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  },

  // ✅ updateMe will not crash even if model doesn't support it
  updateMe(req, res) {
    try {
      const user = getAuthedUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      if (typeof User.updateMe !== "function") {
        return res.status(501).json({ error: "Profile update not implemented yet" });
      }

      const updated = User.updateMe(user.id, req.body || {});
      return res.json(safeUser(updated));
    } catch {
      return res.status(500).json({ error: "Server error" });
    }
  }
};
