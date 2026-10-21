import { IMAGE_KIT_PUBLIC_KEY } from "./config";

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const ACCEPTED_IMAGE_TYPES = ALLOWED_TYPES.join(",");

export const validateImage = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please choose a PNG, JPEG, WebP or GIF image.";
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Images must be smaller than ${MAX_SIZE_MB} MB.`;
  }
  return null;
};

/**
 * Uploads an image straight to ImageKit using a short-lived signature from our
 * backend, and returns its ImageKit file path.
 */
export const uploadImage = async (file, request) => {
  const { signature, expire, token } = await request("/api/upload");

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name || "upload");
  form.append("publicKey", IMAGE_KIT_PUBLIC_KEY);
  form.append("signature", signature);
  form.append("expire", String(expire));
  form.append("token", token);
  form.append("useUniqueFileName", "true");
  form.append("folder", "/chat-ai");

  const res = await fetch(UPLOAD_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error("Image upload failed. Please try again.");

  const { filePath } = await res.json();
  return filePath;
};
