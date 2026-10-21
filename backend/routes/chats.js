import { Router } from "express";
import mongoose from "mongoose";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import Upload from "../models/upload.js";
import { config } from "../config.js";
import { HttpError } from "../lib/httpError.js";
import { isValidImagePath } from "../lib/imagekit.js";
import { streamReply, toAiHttpError, toGeminiContents } from "../lib/gemini.js";
import { deleteUploads } from "../lib/uploads.js";
import { requireUser } from "../middleware/auth.js";
import { aiBurstLimiter, aiDailyLimiter } from "../middleware/rateLimits.js";

const router = Router();
router.use(requireUser);

const MAX_MESSAGE_LENGTH = 8000;
const MAX_TITLE_LENGTH = 100;
const PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;
const EMPTY_REPLY =
  "_I couldn't generate a response to that. Please try rephrasing your message._";
const TRUNCATED_NOTE =
  "\n\n_(This reply reached the maximum length and was cut short. Ask me to continue.)_";

const cleanTitle = (text) => text?.replace(/\s+/g, " ").trim() ?? "";
const makeTitle = (text) => cleanTitle(text).slice(0, 60) || "Image conversation";
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Chat not found.");
  return new mongoose.Types.ObjectId(String(id));
};

const findChat = async (id, userId) => {
  const chat = await Chat.findOne({ _id: toObjectId(id), userId }).lean();
  if (!chat) throw new HttpError(404, "Chat not found.");
  return chat;
};

/**
 * Validates `{ text, img }` from a request body. The image must be one the user
 * uploaded. With `optional`, an empty body is allowed and returns null.
 */
const parseMessage = async (body, userId, { optional = false } = {}) => {
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const img = body?.img || undefined;

  if (!text && !img) {
    if (optional) return null;
    throw new HttpError(400, "Message cannot be empty.");
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (img !== undefined) {
    const owned = isValidImagePath(img) && (await Upload.exists({ userId, filePath: img }));
    if (!owned) throw new HttpError(400, "Invalid image. Please upload it again.");
  }

  return { role: "user", text, ...(img && { img }) };
};

// Cursor for the chat list: "<updatedAt in ms>_<chat id>" of the last chat
// on the previous page.
const parseCursor = (cursor) => {
  if (typeof cursor !== "string") return null;
  const [time, id] = cursor.split("_");
  const date = new Date(Number(time));
  if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(id)) {
    throw new HttpError(400, "Invalid cursor.");
  }
  return { date, id: new mongoose.Types.ObjectId(id) };
};

/** GET /api/chats?q=&cursor=&limit= : the user's chats, most recent first. */
router.get("/", async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || PAGE_SIZE, MAX_PAGE_SIZE);
  const search = typeof req.query.q === "string" ? cleanTitle(req.query.q).slice(0, 100) : "";
  const cursor = parseCursor(req.query.cursor);

  const filter = { userId: req.userId };
  if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };
  if (cursor) {
    filter.$or = [
      { updatedAt: { $lt: cursor.date } },
      { updatedAt: cursor.date, _id: { $lt: cursor.id } },
    ];
  }

  const chats = await Chat.find(filter)
    .select({ title: 1, updatedAt: 1 })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const page = chats.slice(0, limit);
  const last = page.at(-1);
  res.json({
    chats: page,
    nextCursor: chats.length > limit ? `${last.updatedAt.getTime()}_${last._id}` : null,
  });
});

router.post("/", async (req, res) => {
  const message = await parseMessage(req.body, req.userId);

  const chat = await Chat.create({
    userId: req.userId,
    title: makeTitle(message.text),
    messageCount: 1,
  });
  try {
    await Message.create({ ...message, chatId: chat._id, userId: req.userId });
  } catch (err) {
    await Chat.deleteOne({ _id: chat._id });
    throw err;
  }
  if (message.img) {
    await Upload.updateOne({ userId: req.userId, filePath: message.img }, { chatId: chat._id });
  }

  res.status(201).json({ id: chat._id });
});

router.get("/:id", async (req, res) => {
  const chat = await findChat(req.params.id, req.userId);
  const messages = await Message.find({ chatId: chat._id })
    .select({ role: 1, text: 1, img: 1 })
    .sort({ _id: 1 })
    .lean();

  res.json({ _id: chat._id, title: chat.title, updatedAt: chat.updatedAt, messages });
});

router.patch("/:id", async (req, res) => {
  const title = cleanTitle(typeof req.body?.title === "string" ? req.body.title : "");
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `Titles must be 1 to ${MAX_TITLE_LENGTH} characters.`);
  }

  // Renaming shouldn't move the chat to the top of the list.
  const { matchedCount } = await Chat.updateOne(
    { _id: toObjectId(req.params.id), userId: req.userId },
    { $set: { title } },
    { timestamps: false }
  );
  if (!matchedCount) throw new HttpError(404, "Chat not found.");

  res.json({ _id: req.params.id, title });
});

router.delete("/", async (req, res) => {
  await Chat.deleteMany({ userId: req.userId });
  await Message.deleteMany({ userId: req.userId });
  await deleteUploads({ userId: req.userId });
  res.status(204).end();
});

router.delete("/:id", async (req, res) => {
  const chat = await Chat.findOneAndDelete({ _id: toObjectId(req.params.id), userId: req.userId });
  if (!chat) throw new HttpError(404, "Chat not found.");

  await Message.deleteMany({ chatId: chat._id });
  await deleteUploads({ userId: req.userId, chatId: chat._id });
  res.status(204).end();
});

/**
 * Streams the AI reply as plain text.
 *
 * With a `{ text, img }` body, the message is added to the chat and answered.
 * With an empty body, the chat's last message must be an unanswered user
 * message (a freshly created chat, or a retry after a failure).
 *
 * Only the most recent messages are sent to Gemini. The user message and the
 * reply are saved together once the stream finishes, so a failed request
 * leaves the chat unchanged. If the client stops the stream early, the
 * partial reply is kept.
 */
router.post("/:id/reply", aiBurstLimiter, aiDailyLimiter, async (req, res) => {
  const chat = await findChat(req.params.id, req.userId);
  const newMessage = await parseMessage(req.body, req.userId, { optional: true });

  const newCount = newMessage ? 2 : 1;
  if (chat.messageCount + newCount > config.chats.maxMessagesPerChat) {
    throw new HttpError(400, "This chat has reached its length limit. Please start a new chat.");
  }

  const recent = (
    await Message.find({ chatId: chat._id })
      .select({ role: 1, text: 1, img: 1 })
      .sort({ _id: -1 })
      .limit(config.ai.contextMessages)
      .lean()
  ).reverse();

  if (!newMessage && recent.at(-1)?.role !== "user") {
    throw new HttpError(400, "There is no message to reply to.");
  }

  const context = newMessage
    ? [...recent.slice(-(config.ai.contextMessages - 1)), newMessage]
    : recent;
  const contents = await toGeminiContents(context);

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  // Gemini can stall under heavy load; give up instead of waiting forever.
  let timedOut = false;
  let timer;
  const armTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config.ai.timeoutMs);
  };

  // Wait for the first chunk before sending headers, so errors that happen
  // up front (quota, overload, invalid request...) still get a proper status.
  let iterator;
  let first;
  armTimeout();
  try {
    iterator = (await streamReply(contents, controller.signal))[Symbol.asyncIterator]();
    first = await iterator.next();
  } catch (err) {
    clearTimeout(timer);
    if (timedOut) {
      throw new HttpError(504, "The AI took too long to respond. Please try again.");
    }
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
  let finishReason;
  try {
    for (let step = first; !step.done; step = await iterator.next()) {
      armTimeout();
      finishReason = step.value.candidates?.[0]?.finishReason ?? finishReason;
      const text = step.value.text;
      if (text) {
        answer += text;
        res.write(text);
      }
    }
  } catch (err) {
    if (timedOut) {
      console.error("Gemini stream stalled; keeping the partial reply.");
    } else if (!controller.signal.aborted) {
      console.error("Gemini stream failed:", err);
      failed = true;
    }
  } finally {
    clearTimeout(timer);
  }

  if (!answer) {
    if (failed || controller.signal.aborted) {
      res.destroy();
      return;
    }
    // e.g. the response was blocked by safety filters.
    answer = EMPTY_REPLY;
    res.write(answer);
  } else if (finishReason === "MAX_TOKENS") {
    answer += TRUNCATED_NOTE;
    res.write(TRUNCATED_NOTE);
  }

  const newItems = [
    ...(newMessage ? [newMessage] : []),
    { role: "model", text: answer },
  ].map((message) => ({ ...message, chatId: chat._id, userId: req.userId }));

  await Message.insertMany(newItems, { ordered: true });
  await Chat.updateOne({ _id: chat._id }, { $inc: { messageCount: newItems.length } });
  if (newMessage?.img) {
    await Upload.updateOne(
      { userId: req.userId, filePath: newMessage.img },
      { chatId: chat._id }
    );
  }

  res.end();
});

export default router;
