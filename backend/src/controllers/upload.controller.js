import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "../config/upload.js";

export const UploadController = {
  // multer middleware already stored the file to disk
  single(req, res) {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // IMPORTANT: some broken proxy/client setups may create an empty (0 byte) file but still hit this handler.
    // If we return ok=true for a 0 byte file, admin will later download 0KB. So we MUST reject and delete it.
    const size = Number(req.file.size || 0);
    const full = path.join(UPLOAD_DIR, req.file.filename);
    try {
      const st = fs.existsSync(full) ? fs.statSync(full) : null;
      const diskSize = Number(st?.size || 0);
      const finalSize = Math.max(size, diskSize);
      if (!finalSize) {
        // delete empty file if created
        try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch {}
        return res.status(400).json({ error: "Upload failed (empty file). Please try again." });
      }
    } catch {
      // If stat fails, treat as failure
      try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch {}
      return res.status(400).json({ error: "Upload failed. Please try again." });
    }

    const url = `/uploads/${req.file.filename}`;
    return res.json({ ok: true, filename: req.file.filename, url });
  }
};
