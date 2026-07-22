import { Router } from "express";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, filename);
  },
});

const upload = multer({ storage });

// POST /api/upload
router.post(
  "/",
  authenticateUser,
  requireManagerOrAdmin,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      return res.status(201).json({ url: fileUrl });
    } catch (error) {
      console.error("Upload POST error:", error);
      return res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

export default router;
export { UPLOAD_DIR };
