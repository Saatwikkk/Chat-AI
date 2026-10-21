import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { config } from "../config.js";

const limiter = ({ windowMs, limit, message, perUser = false }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: message },
    ...(perUser && {
      keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip),
    }),
  });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const apiLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 500,
  message: "Too many requests. Please slow down.",
});

// AI replies cost money, so they get their own per-user budget.
export const aiBurstLimiter = limiter({
  windowMs: MINUTE,
  limit: 10,
  perUser: true,
  message: "You're sending messages too quickly. Please wait a moment.",
});

export const aiDailyLimiter = limiter({
  windowMs: DAY,
  limit: config.ai.dailyLimit,
  perUser: true,
  message: "You've reached today's message limit. Please come back tomorrow.",
});

export const uploadHourlyLimiter = limiter({
  windowMs: HOUR,
  limit: config.uploads.hourlyLimit,
  perUser: true,
  message: "You've uploaded a lot of images recently. Please try again later.",
});

export const uploadDailyLimiter = limiter({
  windowMs: DAY,
  limit: config.uploads.dailyLimit,
  perUser: true,
  message: "You've reached today's image upload limit. Please come back tomorrow.",
});

export const contactLimiter = limiter({
  windowMs: HOUR,
  limit: 5,
  message: "Too many messages sent. Please try again later.",
});
