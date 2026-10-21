// Empty when the API is served from the same origin (production single-service
// deploy, or the Vite dev proxy).
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const IMAGE_KIT_ENDPOINT = (import.meta.env.VITE_IMAGE_KIT_ENDPOINT || "").replace(
  /\/$/,
  ""
);

const missing = Object.entries({
  VITE_CLERK_PUBLISHABLE_KEY: CLERK_PUBLISHABLE_KEY,
  VITE_IMAGE_KIT_ENDPOINT: IMAGE_KIT_ENDPOINT,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

// URL of an uploaded image, resized by ImageKit (e.g. transform "w-800").
export const imageUrl = (filePath, transform) =>
  `${IMAGE_KIT_ENDPOINT}${filePath}${transform ? `?tr=${transform}` : ""}`;
