import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 8080),
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
  DB_PATH: process.env.DB_PATH || "./src/db/app.sqlite",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@roboticsleb.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123"
  ,
  // Google OAuth (Google Identity Services)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ""
};
