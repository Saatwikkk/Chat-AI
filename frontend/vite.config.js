import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const SITE_NAME = "CHAT AI";
const TITLE = "CHAT AI: your AI companion for chat, images and code";
const DESCRIPTION =
  "Chat with an AI assistant, upload images for it to analyze, and get help with code. Your conversations are saved to your account.";

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Injects Open Graph / Twitter tags for link previews. Crawlers need absolute
// URLs, so they use VITE_SITE_URL (e.g. https://chat.example.com) when set.
const socialMeta = (siteUrl) => ({
  name: "social-meta",
  transformIndexHtml(html) {
    const base = siteUrl.replace(/\/$/, "");
    const image = `${base}/og-image.jpg`;
    const tags = [
      ["property", "og:type", "website"],
      ["property", "og:site_name", SITE_NAME],
      ["property", "og:title", TITLE],
      ["property", "og:description", DESCRIPTION],
      ["property", "og:image", image],
      ["property", "og:image:width", "1200"],
      ["property", "og:image:height", "630"],
      ["property", "og:image:alt", "CHAT AI logo and robot mascot"],
      ...(base ? [["property", "og:url", `${base}/`]] : []),
      ["name", "twitter:card", "summary_large_image"],
      ["name", "twitter:title", TITLE],
      ["name", "twitter:description", DESCRIPTION],
      ["name", "twitter:image", image],
    ]
      .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`)
      .join("\n    ");
    const canonical = base ? `\n    <link rel="canonical" href="${base}/" />` : "";
    return html.replace("<!-- social-meta -->", tags + canonical);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), socialMeta(env.VITE_SITE_URL || "")],
    server: {
      // In development the API is reached through this proxy, so VITE_API_URL
      // can stay empty and no CORS setup is needed.
      proxy: {
        "/api": env.DEV_API_PROXY || "http://localhost:8000",
      },
    },
  };
});
