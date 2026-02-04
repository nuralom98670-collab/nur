import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 8080),

  JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
  DB_PATH: process.env.DB_PATH || "./src/db/app.sqlite",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@roboticsleb.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",

  // Google OAuth
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ||
    "182197300232-ctt6u373u5nt21r1u85j8vklsq8fe2is.apps.googleusercontent.com",

  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // তোমার backend callback রুটের URL (নিচে routes এ আমি /auth/google/callback ধরেছি)
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL || "https://nur-1.onrender.com/auth/google/callback",
};
