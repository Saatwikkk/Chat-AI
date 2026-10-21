import mongoose from "mongoose";

// A conversation's metadata. Its messages live in the `messages` collection,
// so a long conversation never runs into MongoDB's 16 MB document limit.
const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Serves the sidebar query: a user's chats, most recently active first.
chatSchema.index({ userId: 1, updatedAt: -1, _id: -1 });

export default mongoose.models.chat || mongoose.model("chat", chatSchema);
