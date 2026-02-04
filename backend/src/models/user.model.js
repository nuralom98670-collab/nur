import { db } from "../db/index.js";

export const User = {
  findByEmail(email) {
    const e = String(email || "").toLowerCase().trim();
    return db
      .prepare("SELECT id,name,email,role,passwordHash,phone,address,createdAt,lastLoginAt FROM users WHERE email=?")
      .get(e);
  },
  findById(id) {
    return db
      .prepare("SELECT id,name,email,role,phone,address,createdAt,lastLoginAt FROM users WHERE id=?")
      .get(id);
  },
  updateMe(id, data) {
    const name = (data?.name ?? "").toString().trim();
    const phone = (data?.phone ?? "").toString().trim();
    const address = (data?.address ?? "").toString().trim();

    db.prepare("UPDATE users SET name=?, phone=?, address=? WHERE id=?").run(
      name || null,
      phone || null,
      address || null,
      id
    );
    return this.findById(id);
  }
};
