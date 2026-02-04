import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import { routes } from "./routes/index.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { UPLOAD_DIR, ensureUploadDir } from "./config/upload.js";

export function createApp() {
  const app = express();
  app.use(cors(corsOptions));
  // Parse cookies so auth can read the session token from cookies.
  app.use(cookieParser());
  // Allow base64 image upload for manual payment proofs
  app.use(express.json({ limit: "10mb" }));

  // Serve uploaded files (service request attachments, blog/product images, etc.)
  // This is required for admin to download files and for public pages to display images.
  ensureUploadDir();
  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      fallthrough: false,
      setHeaders(res) {
        // A bit of hardening: prevent MIME sniffing
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    })
  );

  app.use("/api", routes);

  app.use(errorHandler);
  return app;
}
