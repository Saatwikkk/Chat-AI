import mongoose from "mongoose";

const partSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "model"],
      required: true,
    },
    parts: [partSchema],
    img: {
      type: String,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      maxlength: 100,
    },
    history: [messageSchema],
  },
  { timestamps: true }
);

// Serves the sidebar query: a user's chats, most recently active first.
chatSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.chat || mongoose.model("chat", chatSchema);
