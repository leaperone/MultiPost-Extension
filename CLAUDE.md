# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
pnpm i
sh prisma/generate.sh
```

### Development Server
```bash
pnpm dev
# or with environment
NODE_ENV=development pnpm dev
```

### Build and Production
```bash
pnpm build                    # Runs Prisma generate and Next.js build
pnpm start                   # Start production server
```

### Code Quality
```bash
pnpm lint                    # Next.js linter
pnpm eslint                  # ESLint check
pnpm eslint:fix             # ESLint with auto-fix
```

### Database
```bash
sh prisma/generate.sh       # Generate Prisma client
sh prisma/migrate.sh        # Run database migrations
sh prisma/migrate_deploy.sh # Deploy migrations to production
```

### Worker Process
```bash
pnpm build:worker           # Build worker TypeScript
pnpm dev:worker             # Build worker with watch mode
pnpm worker                 # Run worker process
```

### Development Database (Docker)
```bash
docker compose -f docker/docker-compose.yml down --volume
docker compose -f docker/docker-compose.yml up -d
```

### Release Management
```bash
pnpm release                # Standard version bump
pnpm release:100            # Major version
pnpm release:010            # Minor version
pnpm release:001            # Patch version
```

## Architecture Overview

**MultiPost** is a Next.js 15 social media publishing platform with browser extension integration.

### Core Architecture
- **Next.js App Router**: Modern routing with server/client components
- **NextAuth.js**: Authentication with GitHub, Google, Passkey, and Mailgun providers
- **Prisma + PostgreSQL**: Database with custom client generation
- **Zustand**: Client-side state management (drafts, publishing, chat history)
- **Credit System**: Built-in payment and usage tracking with Stripe/Alipay integration
- **Worker System**: Background job processing for content publishing and image generation

### Key Components

#### Authentication (`auth.ts`)
- Multi-provider auth (GitHub, Google, Passkey, Mailgun)
- Automatic user credit allocation (0.5 for signup, 1.0 for GitHub)
- Custom user session extensions

#### Database (`lib/db.ts`, `prisma/`)
- Custom Prisma client (`client_multipost`) with singleton pattern
- Schema includes Users, Credits, Social Media Accounts, Extensions, Drafts, Image/Poster Generation
- Migration scripts for deployment

#### State Management (`store/`)
- `draft.store.ts`: Draft creation and publishing platform selection
- `publish.store.ts`: Publishing workflow management
- `chat.history.store.ts`: AI chat history persistence

#### Credit System (`actions/credit/`)
- Real-time credit tracking and deduction
- Integration with Stripe and Alipay for recharging
- Usage analytics and admin management

#### Extension Integration (`lib/extension/`, `app/api/extension/`)
- Browser extension client management
- Task queuing and execution
- Real-time communication via API endpoints

#### Content Publishing (`app/dashboard/publish/`)
- Multi-platform publishing (supports various social media platforms)
- Draft management with AI-assisted content creation
- Image generation and media library integration

#### Analytics (`app/dashboard/analytics/`)
- Web analytics tracking with custom event collection
- Geographic and device analytics
- Real-time visitor tracking

### Internationalization
- `i18n/`: Full i18n support with English and Chinese locales
- Client/server-side translation switching
- Localized UI components throughout

### API Structure
- `app/api/`: REST endpoints for extension, analytics, authentication
- `actions/`: Server actions for database operations
- Type-safe API contracts with Zod validation

### Development Patterns
- Server actions for data mutations
- Client components for interactive UI
- Prisma transactions for credit operations
- Environment-based feature toggles
- Docker support for development database