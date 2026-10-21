import { Router } from "express";
import { getUploadAuth } from "../lib/imagekit.js";
import { requireUser } from "../middleware/auth.js";

const router = Router();

// Short-lived signature that lets a signed-in browser upload directly to ImageKit.
router.get("/", requireUser, (req, res) => {
  res.json(getUploadAuth());
});

export default router;
