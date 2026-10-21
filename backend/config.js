import dotenv from "dotenv";

dotenv.config({ quiet: true });

const REQUIRED_VARS = [
  "MONGODB_URI",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "GEMINI_API_KEY",
  "IMAGE_KIT_ENDPOINT",
  "IMAGE_KIT_PUBLIC_KEY",
  "IMAGE_KIT_PRIVATE_KEY",
];

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const env = (name) => process.env[name].trim();

export const config = {
  port: Number(process.env.PORT) || 8000,
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
  imagekit: {
    urlEndpoint: env("IMAGE_KIT_ENDPOINT").replace(/\/$/, ""),
    publicKey: env("IMAGE_KIT_PUBLIC_KEY"),
    privateKey: env("IMAGE_KIT_PRIVATE_KEY"),
  },
};
