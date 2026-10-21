import dotenv from "dotenv";

dotenv.config({ quiet: true });

const REQUIRED_VARS = [
  "MONGODB_URI",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "GEMINI_API_KEY",
  "IMAGE_KIT_ENDPOINT",
  "IMAGE_KIT_PRIVATE_KEY",
];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const env = (name) => process.env[name].trim();

// Positive integer from the environment, or the default.
const intEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const config = {
  port: intEnv("PORT", 8000),
  isProduction: process.env.NODE_ENV === "production",
  mongoUri: env("MONGODB_URI"),
  // Comma-separated list of origins allowed to call the API from a browser.
  clientUrls: (process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean),
  // Set when running behind a reverse proxy (Render, Railway, Nginx...) so
  // rate limiting sees the real client IP.
  trustProxy: process.env.TRUST_PROXY === "true",
  gemini: {
    apiKey: env("GEMINI_API_KEY"),
    model: process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
  },
  ai: {
    // Only the most recent messages are sent to Gemini as context.
    contextMessages: intEnv("AI_CONTEXT_MESSAGES", 20),
    // Upper bound on the length of one reply (includes the model's thinking).
    maxOutputTokens: intEnv("AI_MAX_OUTPUT_TOKENS", 8192),
    dailyLimit: intEnv("AI_DAILY_LIMIT", 200),
    // Max wait for the first chunk of a reply, and between later chunks.
    timeoutMs: intEnv("AI_TIMEOUT_SECONDS", 60) * 1000,
  },
  chats: {
    maxMessagesPerChat: intEnv("MAX_MESSAGES_PER_CHAT", 1000),
  },
  uploads: {
    maxBytes: 5 * 1024 * 1024,
    hourlyLimit: intEnv("UPLOADS_PER_HOUR", 20),
    dailyLimit: intEnv("UPLOADS_PER_DAY", 100),
  },
  imagekit: {
    urlEndpoint: env("IMAGE_KIT_ENDPOINT").replace(/\/$/, ""),
    privateKey: env("IMAGE_KIT_PRIVATE_KEY"),
  },
};
