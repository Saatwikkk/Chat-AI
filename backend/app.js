import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { clerkMiddleware } from "@clerk/express";
import { config } from "./config.js";
import chatsRouter from "./routes/chats.js";
import uploadRouter from "./routes/upload.js";
import contactRouter from "./routes/contact.js";
import { apiLimiter } from "./middleware/rateLimits.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../frontend/dist"
);

export const createApp = () => {
  const app = express();

  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      // The SPA loads Clerk, ImageKit and Google Fonts from other origins; a CSP
      // for that set of third parties is left to the hosting platform.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/api",
    cors({ origin: config.clientUrls.length ? config.clientUrls : false }),
    apiLimiter,
    express.json({ limit: "100kb" }),
    clerkMiddleware(
      config.clientUrls.length ? { authorizedParties: config.clientUrls } : {}
    )
  );

  app.use("/api/chats", chatsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api", notFound);

  // When the frontend has been built, serve it from the same origin so the
  // whole app can be deployed as a single service.
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
