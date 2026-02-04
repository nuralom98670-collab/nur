import { db, nowISO } from "./index.js";
import { env } from "../config/env.js";
import { hashPassword } from "../utils/password.js";

function uid(prefix="id") {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

db.exec("BEGIN");

try {
  // Admin user
  const email = env.ADMIN_EMAIL;
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);

  if (!existing) {
    const passwordHash = hashPassword(env.ADMIN_PASSWORD);
    db.prepare(`
      INSERT INTO users (id,name,email,passwordHash,role,createdAt)
      VALUES (?,?,?,?,?,?)
    `).run(uid("u"), "Admin", email, passwordHash, "admin", nowISO());
  }

  // Default categories (optional)
  const cats = [
    { key: "robot", label: "Robots" },
    { key: "sensor", label: "Sensors" },
    { key: "kit", label: "Kits" }
  ];
  const insCat = db.prepare("INSERT OR IGNORE INTO categories (id,key,label,createdAt) VALUES (?,?,?,?)");
  cats.forEach(c => insCat.run(uid("c"), c.key, c.label, nowISO()));

  // Default services (dashboard)
  const insSvc = db.prepare("INSERT OR IGNORE INTO services (id,name,status,lastRestartAt) VALUES (?,?,?,?)");
  ["API", "DB", "Email"].forEach(name => insSvc.run(uid("svc"), name, "ok", null));

  db.exec("COMMIT");
  console.log("✅ Seed done");
} catch (e) {
  db.exec("ROLLBACK");
  console.error("❌ Seed failed:", e.message);
}
