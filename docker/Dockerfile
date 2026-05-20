FROM node:20.18.1-alpine3.20 AS base
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
RUN sh prisma/generate.sh

FROM deps AS builder
ENV NODE_OPTIONS="--max-old-space-size=8192"

# PostHog source map upload configuration
ARG POSTHOG_API_KEY
ARG POSTHOG_MULTIPOST_ENV_ID
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV POSTHOG_API_KEY=$POSTHOG_API_KEY
ENV POSTHOG_MULTIPOST_ENV_ID=$POSTHOG_MULTIPOST_ENV_ID
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Sentry source map and release configuration
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_URL
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE

ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT \
    SENTRY_URL=$SENTRY_URL \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT \
    SENTRY_RELEASE=$SENTRY_RELEASE

RUN --mount=type=secret,id=sentry_auth_token \
    if [ -f /run/secrets/sentry_auth_token ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
    fi && \
    pnpm --filter multipost-web build && \
    if [ -n "$SENTRY_RELEASE" ] && [ -n "$SENTRY_AUTH_TOKEN" ]; then \
      pnpm dlx @sentry/cli@2.58.5 sourcemaps inject /app/apps/web/.next; \
    fi

FROM scratch AS sourcemaps
COPY --from=builder /app/apps/web/.next/static /static
COPY --from=builder /app/apps/web/.next/server /server

FROM node:20.18.1-alpine3.20 AS final
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

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
RUN find /app/apps/web/.next/static -name '*.map' -delete
EXPOSE 3000
CMD [ "node", "apps/web/server.js" ]

FROM denoland/deno:latest as backend-cache
WORKDIR /app
COPY --from=deps /app/apps/backend/ .
RUN deno cache main.ts

FROM denoland/deno:latest as backend
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY --from=backend-cache /app .
CMD ["deno", "run", "-A", "main.ts"]

FROM denoland/deno:latest as video-stt-worker-cache
WORKDIR /app
COPY --from=deps /app/apps/video-stt-worker/ .
RUN deno cache src/main.ts

FROM denoland/deno:latest as video-stt-worker
RUN apt-get update && apt-get install -y openssl ffmpeg
WORKDIR /app
COPY --from=video-stt-worker-cache /app .
CMD ["deno", "run", "-A", "src/main.ts"]
