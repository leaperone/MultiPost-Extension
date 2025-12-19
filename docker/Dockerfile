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

RUN pnpm run build

FROM node:20.18.1-alpine3.20 AS final
ENV TZ=Asia/Shanghai
WORKDIR /app

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

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD [ "node", "server.js" ]

FROM denoland/deno:latest as backend-cache
WORKDIR /app
COPY --from=deps /app/backend/ .
RUN deno cache main.ts

FROM denoland/deno:latest as backend
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY --from=backend-cache /app .
CMD ["deno", "run", "-A", "main.ts"]