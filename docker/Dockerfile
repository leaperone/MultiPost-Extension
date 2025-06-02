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
RUN wget 'https://git.io/GeoLite2-City.mmdb' -O geo/GeoLite2-City.mmdb

FROM base AS builder
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN --mount=type=cache,id=pnpm-multipost,target=/pnpm/store pnpm install --frozen-lockfile
RUN sh prisma/generate.sh && sh scripts/tracker/build.sh
RUN pnpm run build:worker
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
COPY --from=builder /app/geo ./geo
COPY --from=builder /app/worker/dist ./worker/dist
COPY --from=builder /app/docker/start.sh ./start.sh
EXPOSE 3000
CMD [ "sh", "start.sh" ]
