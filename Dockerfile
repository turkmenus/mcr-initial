# ==========================================
# Base Stage: Node.js 22 + pnpm
# ==========================================
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.23.0
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

# ==========================================
# Dependencies Stage
# ==========================================
FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/schema/package.json ./packages/schema/
COPY packages/db/package.json ./packages/db/
COPY packages/engine/package.json ./packages/engine/
COPY packages/timeline/package.json ./packages/timeline/
COPY packages/casparcg/package.json ./packages/casparcg/
COPY packages/presets/package.json ./packages/presets/
COPY packages/maps/package.json ./packages/maps/
COPY packages/templates/package.json ./packages/templates/
COPY apps/web/package.json ./apps/web/
COPY apps/realtime/package.json ./apps/realtime/
COPY apps/renderer/package.json ./apps/renderer/

RUN pnpm install --frozen-lockfile

# ==========================================
# Packages Builder Stage: Build shared packages only
# ==========================================
FROM dependencies AS packages-builder
WORKDIR /app

COPY . .
RUN pnpm build:packages

# ==========================================
# Target 1: MCR Realtime Hub & Switcher (Node/WS)
# ==========================================
FROM packages-builder AS builder-realtime
WORKDIR /app
RUN pnpm build:realtime

FROM base AS realtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001
ENV CASPAR_HOST=casparcg
ENV CASPAR_PORT=5250

COPY --from=builder-realtime /app ./

EXPOSE 4001
EXPOSE 5250
CMD ["node", "apps/realtime/dist/server.js"]

# ==========================================
# Target 2: MCR Renderer & MAM (FFmpeg Worker + NVENC GPU Support)
# ==========================================
FROM packages-builder AS builder-renderer
WORKDIR /app
RUN pnpm build:renderer

FROM base AS renderer
WORKDIR /app
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=4002
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=all,video,compute,utility
ENV USE_GPU_ACCEL=auto

COPY --from=builder-renderer /app ./

EXPOSE 4002
CMD ["node", "apps/renderer/dist/server.js"]

# ==========================================
# Target 3: MCR Web Studio (Next.js 15)
# ==========================================
FROM packages-builder AS builder-web
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

RUN pnpm build:web

FROM base AS web
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder-web /app ./

EXPOSE 3000
CMD ["pnpm", "--filter", "@mcr/web", "start"]
