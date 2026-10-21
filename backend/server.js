import mongoose from "mongoose";
import { config } from "./config.js";
import { createApp } from "./app.js";

const start = async () => {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  const server = createApp().listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
