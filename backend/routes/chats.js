import { Router } from "express";
import mongoose from "mongoose";
import Chat from "../models/chat.js";
import { HttpError } from "../lib/httpError.js";
import { isValidImagePath } from "../lib/imagekit.js";
import { streamReply, toAiHttpError, toGeminiContents } from "../lib/gemini.js";
import { requireUser } from "../middleware/auth.js";
import { aiBurstLimiter, aiDailyLimiter } from "../middleware/rateLimits.js";

const router = Router();
router.use(requireUser);

const MAX_MESSAGE_LENGTH = 8000;
const EMPTY_REPLY =
  "_I couldn't generate a response to that. Please try rephrasing your message._";

const makeTitle = (text) =>
  text?.replace(/\s+/g, " ").trim().slice(0, 60) || "Image conversation";

// Validates `{ text, img }` from a request body. With `optional`, an empty body
// is allowed and returns null.
const parseMessage = (body, { optional = false } = {}) => {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const img = body?.img || undefined;

  if (!text && !img) {
    if (optional) return null;
    throw new HttpError(400, "Message cannot be empty.");
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (img !== undefined && !isValidImagePath(img)) {
    throw new HttpError(400, "Invalid image.");
  }

  return { role: "user", parts: [{ text }], ...(img && { img }) };
};

const findChat = async (id, userId) => {
  const chat = mongoose.isValidObjectId(id)
    ? await Chat.findOne({ _id: id, userId }).lean()
    : null;
  if (!chat) throw new HttpError(404, "Chat not found.");
  return chat;
};

router.get("/", async (req, res) => {
  const chats = await Chat.find({ userId: req.userId })
    .select({ title: 1, updatedAt: 1, history: { $slice: 1 } })
    .sort({ updatedAt: -1 })
    .lean();

  res.json(
    chats.map((chat) => ({
      _id: chat._id,
      // Chats created before titles were stored fall back to their first message.
      title: chat.title || makeTitle(chat.history?.[0]?.parts?.[0]?.text),
      updatedAt: chat.updatedAt,
    }))
  );
});

router.post("/", async (req, res) => {
  const message = parseMessage(req.body);
  const chat = await Chat.create({
    userId: req.userId,
    title: makeTitle(message.parts[0].text),
    history: [message],
  });
  res.status(201).json({ id: chat._id });
});

router.get("/:id", async (req, res) => {
  res.json(await findChat(req.params.id, req.userId));
});

router.delete("/", async (req, res) => {
  await Chat.deleteMany({ userId: req.userId });
  res.status(204).end();
});

router.delete("/:id", async (req, res) => {
  const { deletedCount } = mongoose.isValidObjectId(req.params.id)
    ? await Chat.deleteOne({ _id: req.params.id, userId: req.userId })
    : { deletedCount: 0 };
  if (!deletedCount) throw new HttpError(404, "Chat not found.");
  res.status(204).end();
});

/**
 * Streams the AI reply as plain text.
 *
 * With a `{ text, img }` body, the message is added to the chat and answered.
 * With an empty body, the chat's last message must be an unanswered user
 * message (a freshly created chat, or a retry after a failure).
 *
 * The user message and the reply are saved together once the stream finishes,
 * so a failed request leaves the chat unchanged. If the client stops the
 * stream early, the partial reply is kept.
 */
router.post("/:id/reply", aiBurstLimiter, aiDailyLimiter, async (req, res) => {
  const chat = await findChat(req.params.id, req.userId);
  const newMessage = parseMessage(req.body, { optional: true });

  if (!newMessage && chat.history.at(-1)?.role !== "user") {
    throw new HttpError(400, "There is no message to reply to.");
  }

  const messages = newMessage ? [...chat.history, newMessage] : chat.history;
  const contents = await toGeminiContents(messages);

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  // Wait for the first chunk before sending headers, so errors that happen
  // up front (quota, invalid request...) still get a proper status code.
  let iterator;
  let first;
  try {
    iterator = (await streamReply(contents, controller.signal))[Symbol.asyncIterator]();
    first = await iterator.next();
  } catch (err) {
    if (controller.signal.aborted) return;
    throw toAiHttpError(err);
  }

  res.status(200).set({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let answer = "";
  let failed = false;
  try {
    for (let step = first; !step.done; step = await iterator.next()) {
      const text = step.value.text;
      if (text) {
        answer += text;
        res.write(text);
      }
    }
  } catch (err) {
    if (!controller.signal.aborted) {
      console.error("Gemini stream failed:", err);
      failed = true;
    }
  }

  if (!answer) {
    if (failed || controller.signal.aborted) {
      res.destroy();
      return;
    }
    // e.g. the response was blocked by safety filters.
    answer = EMPTY_REPLY;
    res.write(answer);
  }

  const newItems = [
    ...(newMessage ? [newMessage] : []),
    { role: "model", parts: [{ text: answer }] },
  ];
  await Chat.updateOne(
    { _id: chat._id, userId: req.userId },
    { $push: { history: { $each: newItems } } }
  );

  res.end();
});

export default router;
