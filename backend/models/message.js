import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "model"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    // ImageKit file path of an attached image.
    img: {
      type: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Messages of a chat in order. ObjectIds increase with insertion order.
messageSchema.index({ chatId: 1, _id: 1 });
messageSchema.index({ userId: 1 });

export default mongoose.models.message || mongoose.model("message", messageSchema);
