import { config } from "../config.js";
import { HttpError } from "./httpError.js";

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const BATCH_DELETE_URL = "https://api.imagekit.io/v1/files/batch/deleteByFileIds";
const BATCH_SIZE = 100;

const authHeader = `Basic ${Buffer.from(`${config.imagekit.privateKey}:`).toString("base64")}`;

const IMAGE_PATH_PATTERN = /^\/[\w\-./]{1,300}$/;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const isValidImagePath = (path) =>
  typeof path === "string" && IMAGE_PATH_PATTERN.test(path) && !path.includes("..");

/** Uploads an image buffer to ImageKit and returns `{ fileId, filePath }`. */
export const uploadImage = async (buffer, { fileName, mimeType, folder }) => {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: authHeader },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.error("ImageKit upload failed:", res.status, await res.text().catch(() => ""));
    throw new HttpError(502, "Image upload failed. Please try again.");
  }

  const { fileId, filePath } = await res.json();
  return { fileId, filePath };
};

const deleteBatch = async (fileIds) => {
  const res = await fetch(BATCH_DELETE_URL, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ fileIds }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.ok) return;

  const body = await res.json().catch(() => ({}));
  // Files that no longer exist are already in the state we want. ImageKit
  // rejects the whole batch when any are missing, so retry without them.
  if (res.status === 404 && Array.isArray(body.missingFileIds)) {
    const remaining = fileIds.filter((id) => !body.missingFileIds.includes(id));
    if (remaining.length) await deleteBatch(remaining);
    return;
  }
  throw new Error(`ImageKit delete failed: ${res.status} ${JSON.stringify(body)}`);
};

/** Deletes files from ImageKit. Throws if ImageKit rejects the request. */
export const deleteImages = async (fileIds) => {
  for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
    await deleteBatch(fileIds.slice(i, i + BATCH_SIZE));
  }
};

// Images are always fetched from our own ImageKit endpoint, so a client can
// never make the server request an arbitrary URL.
export const fetchImageAsInlineData = async (path) => {
  // Let ImageKit downscale large photos so we send Gemini a reasonable payload.
  const url = `${config.imagekit.urlEndpoint}${path}?tr=w-1536,h-1536,c-at_max`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new HttpError(400, "Could not load an attached image. Please upload it again.");
  }

  const mimeType = res.headers.get("content-type")?.split(";")[0];
  if (!mimeType?.startsWith("image/")) {
    throw new HttpError(400, "An attached file is not an image.");
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new HttpError(400, "An attached image is too large.");
  }

  return { inlineData: { mimeType, data: buffer.toString("base64") } };
};
