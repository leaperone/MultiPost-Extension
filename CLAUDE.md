# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Communication Rules

**🇨🇳 Always respond in Chinese (中文) when communicating with the user.** This is a Chinese-focused project and the development team prefers Chinese communication.

**Git commit messages must use English always.** Follow conventional commit format (e.g., `feat:`, `fix:`, `chore:`). Emoji commits are allowed.

**When creating Pull Requests, always create as draft PR by default** using `gh pr create --draft`. Link the relative issues.

**When creating feature branches, use `feature/` prefix** (e.g., `feature/add-user-profile`, `feature/fix-login-bug`).

**Never auto commit. Never push to remote automatically.** Only push when the user explicitly asks to push.

## Development Commands

### Setup and Installation
```bash
pnpm i                      # Install dependencies
```

### Development Server
```bash
pnpm dev                    # Start development server
```

### Database Quick Setup
```bash
make dev                    # Start dev DB + deploy migrations (recommended)
make dbdev                  # Generate Prisma clients + deploy migrations

# Manual commands (if needed)
sh prisma/generate.sh       # Generate Prisma client
sh prisma/migrate.sh        # Run database migrations
sh prisma/migrate_deploy.sh # Deploy migrations to production
```

### Code Quality
```bash
pnpm lint                   # Next.js linter (recommended for quick checks)
pnpm eslint                 # ESLint check
pnpm eslint:fix             # ESLint with auto-fix
```

**Note:** Don't run `pnpm build` during development, just use lint to check.

### Testing
This codebase currently has no test setup. When implementing tests, add appropriate npm scripts to package.json.

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

### Directory Structure

```
app/                    # Next.js App Router pages and routes
├── (default)/         # Route group for default pages (homepage, etc.)
├── account/           # Account management pages
├── activity/          # User activity pages
├── admin/             # Admin dashboard and management
├── api/               # API routes (REST endpoints)
├── auth/              # Authentication pages
├── dashboard/         # User dashboard with publish, draw, analytics
├── legal/             # Legal pages (terms, privacy)
├── signin/            # Sign in page
└── signout/           # Sign out page

actions/               # Server Actions (Next.js server-side functions)
backend/               # Backend worker and job processing
components/            # Reusable React components
hooks/                 # Custom React hooks
i18n/                  # Internationalization (i18n) files
lib/                   # Library code and utilities
prisma/                # Database schemas and migrations
store/                 # Global state management (Zustand)
```

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
- Centralized pricing configuration in `actions/credit/types.ts`

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

## Code Standards

### TypeScript Guidelines

**Type Definitions:**
- **Always use `interface`** over `type` for object types
- **Avoid `enum`** - use const objects or maps instead
- Use Zod for form validation and schema definition

**Naming Conventions:**
- **Components/Interfaces**: `PascalCase`
- **Files/folders**: `camelCase` with hyphens
- **Variables/functions**: `camelCase`
- **Constants**: `SNAKE_CASE`

**Code Patterns:**
- **Function components only** - avoid class components
- **Early returns** for error handling and guard clauses
- Use functional and declarative programming patterns; avoid classes
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)

**Component Organization:**
- When asked to "封装成一个组件", export in the **same file**, don't create a new file

### Performance Optimization
- **Minimize `use client`** - prefer React Server Components (RSC)
- **Minimize `useEffect` and `setState`** - favor server-side logic
- **Wrap client components** in `<Suspense>` boundaries with fallback
- **Use dynamic imports** for heavy/non-critical components
- Optimize images: use WebP format, include size data, implement lazy loading

### AI Integration
- Use Vercel AI SDK for streaming chat UI and model interactions
- Implement proper error handling for AI responses and model switching
- Handle rate limiting and quota exceeded scenarios gracefully
- Use environment variables for API keys and sensitive information

### Comment Guidelines
- Comments should explain **why**, not **what**
- Use JSDoc style for functions and interfaces
- Write comments in English
- Use TODO/FIXME comments with GitHub username and issue references

## UI/Styling Guidelines

### Component Libraries

- **HeroUI** (primary UI library, @heroui/react)
- **Radix UI** for context menus, dialogs, dropdowns
- **Lucide React** for icons (preferred, **ignore** any @iconify/react)
- **Framer Motion** for animations
- **Tailwind CSS** for all styling
- **Shadcn UI** ContextMenu for right-click menus

### Design System - Minimalist Black & White Style

**Critical Rules:**
- **Only use Tailwind semantic colors**: `bg-background`, `text-foreground`, `text-muted-foreground`
- **Borders**: Only `border` class, **never** `border-gray-xxx` or colored borders
- **No colored backgrounds** - strictly black and white aesthetic

**Card Style:**
```tsx
<Card className="shadow-none border">
  {/* Content */}
</Card>
```

### Layout Guidelines

- **Mobile-first responsive design**
- Use `flex` and `grid` for layouts
- Use `gap` for spacing, **avoid margins** between elements

```tsx
// ✅ Correct: Mobile-first, gap for spacing
<div className="w-full md:w-1/2 lg:w-1/3 flex gap-4">

// ❌ Wrong: Desktop-first, margins for spacing
<div className="lg:w-1/3 md:w-1/2 w-full flex [&>*]:mr-4">
```

### Toast Notifications

```tsx
import { addToast } from "@heroui/react";

addToast({
  title: "Toast Title",
  description: "Toast Description",
  hideIcon: true,
});
```

### Icons (Lucide React)

- Use `<HomeIcon />` without size classes by default
- **Only add `className='size-4'` when button size is 'sm'**

### Borders

- **Don't overuse borders** - inputs, forms generally don't need borders
- When borders are needed, use plain `border` class only

## Pricing System

### Current Pricing (defined in `actions/credit/types.ts`)

**Image Generation**: $0.04 per image
- Implementation: `app/dashboard/draw/image/action.ts`, `worker/image.ts`
- Formula: `PRICING.IMAGE_GENERATION × number_of_images`

**Poster Generation**: $0.04 per poster
- Implementation: `app/dashboard/draw/poster/action.ts`

**AI Text Generation (DeepSeek)**:
- Input: $0.00000027 per token
- Output: $0.0000011 per token
- Implementation: `app/api/draft/ai/creation/route.ts`

**Audio Transcription**: $0.000034 per second
- Implementation: `app/api/internal/audio/transcriptions/route.ts`

**File Hosting**: $0.04 per GB transfer

### Credit System Architecture
- **Free Credits**: 0.5 (signup), 1.0 (GitHub signup)
- **Paid Credits**: Stripe ($10 min), Alipay ($1 min)
- **Usage Priority**: Free credits first, then paid credits
- **Tracking**: All usage logged in `creditUsage` table with usage types

### Key Pricing Files
- `actions/credit/types.ts` - All pricing constants and types
- `actions/credit/index.ts` - Credit operations (deduct, add, batch)
- `actions/credit/worker.ts` - Worker process credit deduction
- `actions/credit/recharge.ts` - Stripe/Alipay recharge functionality

## PostHog Analytics

- **Project ID**: 259332
- **Project Name**: MultiPost
- **Organization**: 0199e216-bb22-0000-9349-7facf8dca509

## MCP Servers

Configuration file: `.mcp.json`

### TikHub.io API Docs

TikHub provides APIs for extracting video/audio from social media platforms (Douyin, TikTok, etc.).

- **MCP Server**: `apifox-mcp-server` with site-id `4705614`
- **Usage**: Query TikHub API documentation via MCP tools
- **Available tools**:
  - `read_project_oas` - Read OpenAPI Spec
  - `read_project_oas_ref_resources` - Read $ref resources from OAS
  - `refresh_project_oas` - Refresh OAS from server

**Current usage in project**:
- `lib/tikhub.ts` - TikHub API client wrapper
- `app/api/video/extract/route.ts` - Video extraction endpoint using TikHub

## Important Notes

- Uses **pnpm exclusively** (enforced by preinstall hook)
- Node version managed via `.nvmrc` (v19.7.0)
- **ESLint** for JS/TS linting, **Stylelint** for CSS, **Prettier** for formatting
- **lint-staged + husky** for pre-commit hooks
- Three separate databases (Main, Region, Bilibili)
- **Don't run `pnpm build`** during development, just use lint to check
- Uses **next-safe-action** for type-safe server actions
- Custom authentication implementation (session-based, not NextAuth)

## CI error check
The CI is run in `https://github.com/leaperone/leaperone-releases/actions/workflows/deploy-twssomeren.yml`. You can check the CI status and logs by clicking the "Actions" tab. If error, check the logs and fix the issue.

## planning-with-files & ralph-Loop 使用说明
当用户输入 `planning with files` 字样的命令的时候，一定要触发 planning-with-files plugin
运行 planning-with-files 的结果(findings.md progress.md task_plan.md)都放到 ./.plainning/<the-goal>/* 下，计划完成后，必须生成一条 ralph-loop 的启动指令：
模板：
```bash
/ralph-loop:ralph-loop "@.planning/*  <引用 plan 后，你来给出prompt，明确目标>" --completion-promise "<FLAG>" --max-iterations 10
```
- 重构类任务: `/ralph-loop:ralph-loop "@.planning/* 重构缓存层，确保所有测试通过" --max-iterations 10`
- 添加功能: `/ralph-loop:ralph-loop "@.planning/* 实现用户头像上传功能，包括前端组件和 API 接口" --completion-promise "功能完成" --max-iterations 10`
- 修复 bug: `/ralph-loop:ralph-loop "@.planning/* 修复登录页面的表单验证问题" --max-iterations 10 --completion-promise "修复完成"`
- 测试相关: `/ralph-loop:ralph-loop "@.planning/* 为 actions/ 目录下的所有 server actions 添加单元测试" --completion-promise "TESTS COMPLETE" --max-iterations 10`

| 参数 | 说明 |
|------|------|
| `--max-iterations <n>` | 最大迭代次数，防止无限循环 |
| `--completion-promise <text>` | 完成标识，Claude 输出这个文本时停止 |
