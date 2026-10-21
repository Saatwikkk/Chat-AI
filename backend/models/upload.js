import mongoose from "mongoose";

// An image a user uploaded to ImageKit. Recording uploads lets the API check
// that a user only attaches their own images, delete a chat's images together
// with the chat, and clean up images that were uploaded but never sent.
const uploadSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    fileId: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
    },
    // Set once the image is part of a saved message.
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat",
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

uploadSchema.index({ userId: 1, filePath: 1 }, { unique: true });
// Finding a chat's images, and unattached uploads by age.
uploadSchema.index({ chatId: 1, createdAt: 1 });

export default mongoose.models.upload || mongoose.model("upload", uploadSchema);
