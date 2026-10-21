# syntax=docker/dockerfile:1

# One image for the whole app: the Express API serves the built React frontend.
#
# Build locally:
#   docker build -t <DOCKERHUB_USERNAME>/chat-ai \
#     --build-arg VITE_CLERK_PUBLISHABLE_KEY=<pk_...> \
#     --build-arg VITE_IMAGE_KIT_ENDPOINT=<https://ik.imagekit.io/your_id> \
#     --build-arg VITE_SITE_URL=<https://your-domain> .

ARG NODE_VERSION=24

# ---- Frontend build ----------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

# Vite bakes these into the browser bundle. They are public values (Clerk
# publishable key, ImageKit URL endpoint, site URL), never secrets.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_IMAGE_KIT_ENDPOINT
ARG VITE_SITE_URL=""
ARG VITE_API_URL=""
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_IMAGE_KIT_ENDPOINT=$VITE_IMAGE_KIT_ENDPOINT \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Backend production dependencies -----------------------------------------
FROM node:${NODE_VERSION}-alpine AS backend-deps
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- Runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

ENV NODE_ENV=production \
    PORT=8000

WORKDIR /app
COPY --from=backend-deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/ ./backend/
COPY --from=frontend --chown=node:node /app/frontend/dist ./frontend/dist

USER node
WORKDIR /app/backend
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server.js"]
