import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    userId: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.contactMessage ||
  mongoose.model("contactMessage", contactMessageSchema);
