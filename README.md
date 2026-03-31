# MultiPost

Multi-platform social media content publishing SaaS. This monorepo contains the web app, desktop client, browser extension, backend workers, and shared packages.

## Project Structure

| App | Path | Tech Stack | Description |
|-----|------|------------|-------------|
| **Web** | `apps/web/` | Next.js 16 + React 19 + Prisma + PostgreSQL | SaaS web application |
| **Desktop** | `apps/desktop/` | Electron 34 + Vite 6 + React 19 | Desktop client (44+ platform adapters) |
| **Extension** | `apps/extension/` | Plasmo + React 18 | Browser extension (git submodule) |
| **Backend Worker** | `apps/backend/` | Deno + Prisma | Publish tasks, account refresh |
| **Video STT Worker** | `apps/video-stt-worker/` | Deno + Prisma | Video speech-to-text |
| **Shared** | `packages/shared/` | TypeScript | Shared types & platform definitions |

## Quick Start

```bash
# Install all dependencies
pnpm install

# Start Web dev server
pnpm dev

# Start Desktop dev
cd apps/desktop && pnpm dev

# Start Backend worker
cd apps/backend && deno task dev

# Start Video STT worker
cd apps/video-stt-worker && deno task dev
```

## Build

```bash
# Build Web
pnpm build

# Build Desktop
cd apps/desktop && pnpm build

# Platform-specific Desktop builds
cd apps/desktop && pnpm build:mac
cd apps/desktop && pnpm build:win
cd apps/desktop && pnpm build:linux
```

## Database Setup

```bash
# Start dev database (Docker)
docker compose -f .devcontainer/dev-db/docker-compose.yml up -d postgres-multipost

# Generate Prisma client & deploy migrations
make dev
```

## Git Submodule

The browser extension (`apps/extension/`) is a git submodule linked to the public repo [`leaperone/MultiPost-Extension`](https://github.com/leaperone/MultiPost-Extension).

```bash
# After cloning, init submodule
git submodule update --init --recursive
```

## Release

- **Web**: Deployed via CI (tag or manual trigger on `leaperone/leaperone-releases`)
- **Desktop**: Tag `v*` on main triggers build on [`leaperone/MultiPost-Desktop-Release`](https://github.com/leaperone/MultiPost-Desktop-Release), publishing to GitHub Releases + S3

## License

Licensed under the [MIT license](LICENSE).
