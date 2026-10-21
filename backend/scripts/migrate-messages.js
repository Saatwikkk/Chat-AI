/**
 * One-off migration: moves messages from the old embedded `chats.history`
 * array into the `messages` collection, and fills in `title` and
 * `messageCount`. Safe to run more than once.
 *
 *   npm run migrate              (uses MONGODB_URI from backend/.env)
 *   docker compose exec app npm run migrate   (on the server)
 */
import mongoose from "mongoose";
import { config } from "../config.js";
import Message from "../models/message.js";

const makeTitle = (text) =>
  text?.replace(/\s+/g, " ").trim().slice(0, 60) || "Image conversation";

await mongoose.connect(config.mongoUri);
const chats = mongoose.connection.collection("chats");

let migrated = 0;
for await (const chat of chats.find({ "history.0": { $exists: true } })) {
  const messages = chat.history.map((item) => ({
    chatId: chat._id,
    userId: chat.userId,
    role: item.role,
    text: (item.parts ?? []).map((part) => part.text ?? "").join("\n"),
    ...(item.img && { img: item.img }),
  }));

  // Remove any copies from an interrupted earlier run, then insert in order.
  await Message.deleteMany({ chatId: chat._id });
  await Message.insertMany(messages, { ordered: true });
  await chats.updateOne(
    { _id: chat._id },
    {
      $set: {
        title: chat.title || makeTitle(messages[0]?.text),
        messageCount: messages.length,
      },
      $unset: { history: "" },
    }
  );
  migrated += 1;
}

console.log(`Migrated ${migrated} chat(s).`);
await mongoose.disconnect();
