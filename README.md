# CHAT AI

A full-stack, multimodal AI chat app. Sign in, chat with Google Gemini, attach images for it to analyze, and pick up any past conversation later.

**Features**

- Streaming AI replies, with a button to stop generating
- Image attachments, analyzed by Gemini and stored on ImageKit; deleted along with their chat
- Chat history per user with automatic titles: search, rename, delete one chat or clear them all; the list loads page by page
- Accessible dialogs and notifications, keyboard support and screen-reader labels
- Link previews (Open Graph and Twitter cards) when the site is shared
- Markdown answers with tables and syntax-highlighted code
- Authentication with Clerk; the API checks the session on every request
- Responsive layout with a slide-out chat list on mobile
- Contact form that saves messages to MongoDB
- Cost controls: per-user rate limits on AI replies and uploads, only recent messages sent as context, a reply-length cap and a timeout

## Tech stack

| Layer    | Tools                                                                   |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 19, Vite, React Router, TanStack Query, Clerk, react-markdown     |
| Backend  | Node.js, Express 5, Mongoose, `@clerk/express`, `@google/genai`, Helmet |
| Services | MongoDB Atlas, Clerk, Google Gemini API, ImageKit                       |

## How it works

```
Browser ──(Clerk session token)──► Express API ──► MongoDB   (chats, messages, uploads, contact)
                                       ├─────────► Gemini    (AI replies, streamed back)
                                       └─────────► ImageKit  (image storage)
```

- The Gemini API key lives only on the server. The browser never talks to Gemini directly.
- Images are uploaded through the API, which checks the file type, stores the image on ImageKit in the user's folder, and records who owns it. Users can only attach their own images. Images are deleted with their chat, and images that were uploaded but never sent are removed after 24 hours.
- Each message is its own MongoDB document, so long chats never hit MongoDB's 16 MB document limit. Only the most recent messages (20 by default) are sent to Gemini.
- `POST /api/chats/:id/reply` streams the answer as plain text. The user message and the reply are saved together when the stream ends, so a failed request never leaves a half-saved chat.

### API

All routes except `/api/health` and `/api/contact` need a signed-in user (`Authorization: Bearer <Clerk session token>`).

| Method   | Route                  | Description                                           |
| -------- | ---------------------- | ----------------------------------------------------- |
| `GET`    | `/api/health`          | Health check                                          |
| `GET`    | `/api/chats`           | The user's chats, newest first. Query: `q` (title search), `cursor`, `limit`. Returns `{ chats, nextCursor }` |
| `POST`   | `/api/chats`           | Create a chat from `{ text, img? }`, returns `{ id }` |
| `GET`    | `/api/chats/:id`       | Chat with its messages                                |
| `PATCH`  | `/api/chats/:id`       | Rename a chat `{ title }`                             |
| `POST`   | `/api/chats/:id/reply` | Stream an AI reply (body `{ text?, img? }`)           |
| `DELETE` | `/api/chats/:id`       | Delete one chat and its images                        |
| `DELETE` | `/api/chats`           | Delete all of the user's chats                        |
| `POST`   | `/api/uploads`         | Upload an image (raw bytes, `Content-Type: image/*`, max 5 MB), returns `{ filePath }` |
| `POST`   | `/api/contact`         | Save a contact message `{ name, email, message }`     |

## Running locally

**Prerequisites:** Node.js 20.11+, plus free accounts on [MongoDB Atlas](https://www.mongodb.com/atlas), [Clerk](https://clerk.com), [Google AI Studio](https://aistudio.google.com/apikey) and [ImageKit](https://imagekit.io).

1. Install dependencies:

   ```sh
   npm run install:all
   ```

2. Create the env files from the examples and fill them in:

   ```sh
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   In MongoDB Atlas, add your IP address under **Network Access**.

3. Start the API and the frontend in two terminals:

   ```sh
   npm run dev:backend    # http://localhost:8000
   npm run dev:frontend   # http://localhost:5173
   ```

   In development, Vite proxies `/api` to the backend, so `VITE_API_URL` can stay empty.

### With Docker

```sh
docker compose --env-file frontend/.env up --build   # http://localhost:8000
```

This builds the production image and runs it with a local MongoDB container. Secrets come from `backend/.env`.

## Deployment

### Automated: GitHub Actions → Docker Hub → your server

From the **Actions** tab, **Run workflow** on *Deploy* tests the code, builds a Docker image, pushes it to Docker Hub, and has your server pull and restart it behind HTTPS. Workflows never run automatically on push. Setup takes about 15 minutes: see **[deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)**.

| File                                                           | Purpose                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [Dockerfile](Dockerfile)                                       | Multi-stage build: React bundle + API in one image   |
| [.github/workflows/ci.yml](.github/workflows/ci.yml)           | Lint, build, smoke tests, audit, image build (manual) |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml)   | CI → push to Docker Hub → deploy over SSH (+ rollback) |
| [deploy/docker-compose.yml](deploy/docker-compose.yml)         | Server stack: app, MongoDB, Caddy (automatic HTTPS)  |
| [deploy/setup-server.sh](deploy/setup-server.sh)               | One-time server setup                                |

### Option A: one service on a platform (Render etc.)

The backend serves the built frontend, so the whole app runs as a single web service with no CORS setup.

**Render:** push the repo to GitHub, choose **New → Blueprint**, and select the repo. Render reads [render.yaml](render.yaml) and asks for each environment variable. Set `CLIENT_URL` to the URL Render gives you (e.g. `https://chat-ai.onrender.com`).

**Any other Node host** (Railway, Fly.io, a VPS...):

```sh
npm run build   # installs both apps and builds frontend/dist
npm start       # starts the API, which also serves frontend/dist
```

Set every variable from `backend/.env.example` plus the three `VITE_*` variables (needed at build time), and add `NODE_ENV=production` and `TRUST_PROXY=true`.

### Option B: frontend and API hosted separately

- **API** (e.g. Render web service with root directory `backend`, start command `npm start`): set the backend variables, with `CLIENT_URL` set to the frontend's URL.
- **Frontend** (e.g. Vercel with root directory `frontend`): set the `VITE_*` variables, with `VITE_API_URL` set to the API's URL. [frontend/vercel.json](frontend/vercel.json) already rewrites routes to `index.html`.

### After deploying

- In the Clerk dashboard, add your production domain, or create a production instance and use its keys.
- In MongoDB Atlas **Network Access**, allow your host's outbound IPs, or `0.0.0.0/0` for hosts with changing IPs.

## Project structure

```
backend/
  server.js            connects to MongoDB, then starts the app
  app.js               Express app: security middleware, routes, static frontend
  config.js            environment variable loading and validation
  routes/              chats, upload, contact
  middleware/          auth, rate limits, error handling
  lib/                 Gemini, ImageKit, HttpError helpers
  models/              Chat, ContactMessage
frontend/src/
  layouts/             root layout (header, providers), dashboard layout (sidebar)
  routes/              pages
  components/          ChatList, ChatMessage, PromptForm, BotShowcase
  lib/                 API client, image upload, config
```
