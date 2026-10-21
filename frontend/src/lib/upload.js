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
 * Uploads an image through our API (which stores it on ImageKit) and returns
 * its ImageKit file path.
 */
export const uploadImage = async (file, request) => {
  const { filePath } = await request("/api/uploads", { method: "POST", body: file });
  return filePath;
};
