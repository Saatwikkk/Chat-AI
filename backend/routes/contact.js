import { Router } from "express";
import { getAuth } from "@clerk/express";
import ContactMessage from "../models/contactMessage.js";
import { HttpError } from "../lib/httpError.js";
import { contactLimiter } from "../middleware/rateLimits.js";

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readString = (value) => (typeof value === "string" ? value.trim() : "");

router.post("/", contactLimiter, async (req, res) => {
  const name = readString(req.body?.name);
  const email = readString(req.body?.email);
  const message = readString(req.body?.message);

  if (!name || name.length > 100) {
    throw new HttpError(400, "Please enter your name (up to 100 characters).");
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 200) {
    throw new HttpError(400, "Please enter a valid email address.");
  }
  if (message.length < 10 || message.length > 5000) {
    throw new HttpError(400, "Your message should be between 10 and 5000 characters.");
  }

  await ContactMessage.create({
    name,
    email,
    message,
    userId: getAuth(req).userId ?? undefined,
  });

  res.status(201).json({ ok: true });
});

export default router;
