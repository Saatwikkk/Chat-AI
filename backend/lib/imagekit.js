import { createHmac, randomUUID } from "node:crypto";
import { config } from "../config.js";
import { HttpError } from "./httpError.js";

const UPLOAD_AUTH_TTL_SECONDS = 30 * 60;

/**
 * Short-lived parameters that let a browser upload one file directly to
 * ImageKit (same algorithm as the official SDK's getAuthenticationParameters).
 */
export const getUploadAuth = () => {
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + UPLOAD_AUTH_TTL_SECONDS;
  const signature = createHmac("sha1", config.imagekit.privateKey)
    .update(token + expire)
    .digest("hex");
  return { token, expire, signature };
};

const IMAGE_PATH_PATTERN = /^\/[\w\-./]{1,300}$/;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Only ImageKit file paths are accepted from clients. Images are always fetched
// from our own ImageKit endpoint, so a client can never make the server request
// an arbitrary URL.
export const isValidImagePath = (path) =>
  typeof path === "string" && IMAGE_PATH_PATTERN.test(path) && !path.includes("..");

export const fetchImageAsInlineData = async (path) => {
  // Let ImageKit downscale large photos so we send Gemini a reasonable payload.
  const url = `${config.imagekit.urlEndpoint}${path}?tr=w-1536,h-1536,c-at_max`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new HttpError(400, "Could not load the attached image. Please upload it again.");
  }

  const mimeType = res.headers.get("content-type")?.split(";")[0];
  if (!mimeType?.startsWith("image/")) {
    throw new HttpError(400, "The attached file is not an image.");
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new HttpError(400, "The attached image is too large.");
  }

  return { inlineData: { mimeType, data: buffer.toString("base64") } };
};
