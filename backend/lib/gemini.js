import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import { HttpError } from "./httpError.js";
import { fetchImageAsInlineData } from "./imagekit.js";

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

const SYSTEM_INSTRUCTION = `You are CHAT AI, a friendly and knowledgeable assistant.
Answer clearly and accurately. Use Markdown for formatting, and fenced code blocks with a language tag for code.
If you are not sure about something, say so instead of guessing.`;

// Older images in a long conversation are replaced by a placeholder so a single
// request never has to download and send an unbounded number of images.
const MAX_IMAGES_PER_REQUEST = 4;

/**
 * Converts stored chat messages into Gemini `contents`, downloading attached
 * images and merging consecutive messages from the same role (Gemini expects
 * user/model turns to alternate).
 */
export const toGeminiContents = async (messages) => {
  const imageIndexes = messages
    .map((message, index) => (message.img ? index : -1))
    .filter((index) => index !== -1);
  const includedImages = new Set(imageIndexes.slice(-MAX_IMAGES_PER_REQUEST));

  const images = await Promise.all(
    messages.map((message, index) =>
      includedImages.has(index) ? fetchImageAsInlineData(message.img) : null
    )
  );

  const contents = [];
  messages.forEach((message, index) => {
    const parts = [];
    if (images[index]) parts.push(images[index]);
    else if (message.img) parts.push({ text: "[An image was shared earlier in the conversation.]" });

    const text = message.parts?.map((part) => part.text).join("\n").trim();
    if (text) parts.push({ text });
    if (!parts.length) return;

    const previous = contents.at(-1);
    if (previous?.role === message.role) previous.parts.push(...parts);
    else contents.push({ role: message.role, parts });
  });

  return contents;
};

export const streamReply = (contents, abortSignal) =>
  ai.models.generateContentStream({
    model: config.gemini.model,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
      abortSignal,
    },
  });

// Maps Gemini SDK errors to messages that are safe to show the user.
export const toAiHttpError = (err) => {
  if (err instanceof HttpError) return err;
  console.error("Gemini request failed:", err);
  if (err?.status === 429) {
    return new HttpError(429, "The AI service is busy right now. Please try again in a minute.");
  }
  if (err?.status === 400) {
    return new HttpError(400, "The AI could not process this message. Try rephrasing it.");
  }
  return new HttpError(502, "The AI service is unavailable right now. Please try again.");
};
