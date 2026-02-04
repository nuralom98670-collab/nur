import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src/config => backend/uploads
export const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeExt(originalName = "") {
  const ext = path.extname(originalName).toLowerCase();
  return ext && ext.length <= 10 ? ext : "";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = safeExt(file.originalname);
    const rand = Math.random().toString(16).slice(2);
    cb(null, `${Date.now()}_${rand}${ext}`);
  }
});

function imageFileFilter(req, file, cb) {
  const ok = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml"
  ].includes(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed (jpg/png/webp/gif/svg)."));
  cb(null, true);
}

// Images (posts/products/etc.)
export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Any file (apk/zip/pdf/etc.)
export const uploadAny = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});
