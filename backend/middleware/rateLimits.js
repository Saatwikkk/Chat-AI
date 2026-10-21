import { rateLimit, ipKeyGenerator } from "express-rate-limit";

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
  windowMs: 24 * 60 * MINUTE,
  limit: Number(process.env.AI_DAILY_LIMIT) || 200,
  perUser: true,
  message: "You've reached today's message limit. Please come back tomorrow.",
});

export const contactLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: "Too many messages sent. Please try again later.",
});
