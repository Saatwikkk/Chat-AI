import { Router, raw } from "express";
import Upload from "../models/upload.js";
import { config } from "../config.js";
import { HttpError } from "../lib/httpError.js";
import { uploadImage } from "../lib/imagekit.js";
import { detectImageType } from "../lib/uploads.js";
import { requireUser } from "../middleware/auth.js";
import { uploadDailyLimiter, uploadHourlyLimiter } from "../middleware/rateLimits.js";

const router = Router();

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Receives the raw image bytes (Content-Type: image/*), stores the image on
 * ImageKit in the user's folder and records it as the user's upload.
 */
router.post(
  "/",
  requireUser,
  uploadHourlyLimiter,
  uploadDailyLimiter,
  raw({ type: ACCEPTED_TYPES, limit: config.uploads.maxBytes }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      throw new HttpError(400, "Please choose a PNG, JPEG, WebP or GIF image.");
    }

    const type = detectImageType(req.body);
    if (!type) {
      throw new HttpError(400, "That file isn't a supported image (PNG, JPEG, WebP or GIF).");
    }

    const { fileId, filePath } = await uploadImage(req.body, {
      fileName: `image.${type.ext}`,
      mimeType: type.mimeType,
      folder: `/chat-ai/${req.userId}`,
    });

    await Upload.create({ userId: req.userId, fileId, filePath, size: req.body.length });

    res.status(201).json({ filePath });
  }
);

export default router;
