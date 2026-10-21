import Upload from "../models/upload.js";
import { deleteImages } from "./imagekit.js";

// Identifies an image by its first bytes, so the declared Content-Type of an
// upload can't be used to store other kinds of files.
const SIGNATURES = [
  { mimeType: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: "image/gif", ext: "gif", test: (b) => ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("latin1")) },
  { mimeType: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

export const detectImageType = (buffer) =>
  buffer.length >= 12 ? SIGNATURES.find(({ test }) => test(buffer)) ?? null : null;

/**
 * Deletes the matching uploads from ImageKit and the database. If ImageKit
 * can't be reached, the uploads are detached instead so the orphan sweep
 * retries them later.
 */
export const deleteUploads = async (filter) => {
  const uploads = await Upload.find(filter).select({ fileId: 1 }).lean();
  if (!uploads.length) return;

  const ids = uploads.map((upload) => upload._id);
  try {
    await deleteImages(uploads.map((upload) => upload.fileId));
    await Upload.deleteMany({ _id: { $in: ids } });
  } catch (err) {
    console.error("Deleting images failed; will retry later:", err);
    await Upload.updateMany({ _id: { $in: ids } }, { $set: { chatId: null } });
  }
};

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

// Images that were uploaded but never sent in a message (e.g. the user removed
// the attachment) are deleted after a day.
export const sweepOrphanUploads = () =>
  deleteUploads({ chatId: null, createdAt: { $lt: new Date(Date.now() - ORPHAN_AGE_MS) } });

export const startOrphanUploadSweep = () => {
  const run = () =>
    sweepOrphanUploads().catch((err) => console.error("Orphan upload sweep failed:", err));
  run();
  return setInterval(run, SWEEP_INTERVAL_MS).unref();
};
