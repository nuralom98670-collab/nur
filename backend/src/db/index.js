import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

// Resolve DB path robustly so running the server from different working
// directories never creates a second "empty" database.
function resolveDbPath(p) {
  const raw = String(p || "").trim();
  const fallback = path.resolve(process.cwd(), "src/db/app.sqlite");
  if (!raw) return fallback;
  // If relative, resolve from current working directory (backend/)
  if (!path.isAbsolute(raw)) return path.resolve(process.cwd(), raw);
  return raw;
}

const DB_FILE = resolveDbPath(env.DB_PATH);

// Ensure the parent folder exists (important on fresh installs)
try {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
} catch { /* ignore */ }

export const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

console.log("[DB]", DB_FILE);

export function nowISO() {
  return new Date().toISOString();
}
