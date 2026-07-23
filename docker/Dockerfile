FROM node:20.19.0-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm
RUN apk update --no-cache && apk add --no-cache \
    tzdata \
    python3 \
    make \
    g++ \
    pixman-dev \
    cairo-dev \
    pango-dev \
    pkgconfig \
    ffmpeg
COPY . /app
WORKDIR /app

FROM base AS deps
RUN --mount=type=cache,id=pnpm-multipost,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS builder
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Self-hosted PostHog project 3 runtime configuration. The token remains build-injected.
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Sentry runtime and release configuration. Upload happens outside this build.
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_RELEASE

ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT \
    NEXT_PUBLIC_SENTRY_RELEASE=$SENTRY_RELEASE \
    SENTRY_RELEASE=$SENTRY_RELEASE

RUN pnpm --filter multipost-web build && \
    pnpm dlx @posthog/cli@0.4.4 sourcemap inject \
      --directory /app/apps/web/dist && \
    test -n "$(find /app/apps/web/dist -type f \( -name '*.js' -o -name '*.mjs' \) \
      -exec grep -l '//# chunkId=' {} \; | head -n 1)"

FROM scratch AS sourcemaps
COPY --from=builder /app/apps/web/dist /dist

FROM node:20.19.0-alpine3.20 AS final
ENV TZ=Asia/Shanghai
WORKDIR /app

# Re-declare Sentry runtime variables for the server process (client bundle already inlines NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_RELEASE
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT \
    SENTRY_RELEASE=$SENTRY_RELEASE

RUN apk update --no-cache && \
    apk add --no-cache \
    libstdc++ \
    libgcc \
    libjpeg-turbo \
    cairo \
    pango \
    giflib \
    fontconfig \
    ttf-dejavu \
    ffmpeg

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /usr/share/zoneinfo/Asia/Shanghai /usr/share/zoneinfo/Asia/Shanghai

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
# Web deps live in apps/web/package.json; pnpm links them via relative symlinks
# into the root .pnpm store, so both trees (and workspace packages) must ship.
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/web/public ./apps/web/public
RUN find /app/apps/web/dist -type f -name '*.map' -delete && \
    if find /app/apps/web/dist -type f -name '*.map' | grep -q .; then \
      echo "ERROR: source maps remain in the runtime image" >&2; \
      exit 1; \
    fi
WORKDIR /app/apps/web
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD ["wget","-q","-O","/dev/null","http://127.0.0.1:3000/api/health"]
CMD [ "node", "dist/server/server.js" ]

FROM denoland/deno:latest as backend-cache
WORKDIR /app/apps/backend
COPY --from=deps /app/apps/backend /app/apps/backend
COPY --from=deps /app/db /app/db
RUN deno check main.ts

FROM denoland/deno:latest as backend
RUN apt-get update && apt-get install -y openssl
WORKDIR /app/apps/backend
COPY --from=backend-cache /app /app
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD ["deno", "eval", "const r = await fetch('http://127.0.0.1:9000/health'); Deno.exit(r.ok ? 0 : 1)"]
CMD ["deno", "run", "-A", "main.ts"]

FROM denoland/deno:latest as video-stt-worker-cache
WORKDIR /app/apps/video-stt-worker
COPY --from=deps /app/apps/video-stt-worker /app/apps/video-stt-worker
COPY --from=deps /app/db /app/db
RUN deno check src/main.ts

FROM denoland/deno:latest as video-stt-worker
RUN apt-get update && apt-get install -y openssl ffmpeg procps
WORKDIR /app/apps/video-stt-worker
COPY --from=video-stt-worker-cache /app /app
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["pgrep", "-x", "deno"]
CMD ["deno", "run", "-A", "src/main.ts"]
