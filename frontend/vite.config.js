import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      // In development the API is reached through this proxy, so VITE_API_URL
      // can stay empty and no CORS setup is needed.
      proxy: {
        "/api": env.DEV_API_PROXY || "http://localhost:8000",
      },
    },
  };
});
