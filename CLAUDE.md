# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a **pnpm workspace monorepo** containing all MultiPost projects:

```
.                              # Monorepo root / orchestrator
├── apps/
│   ├── web/                   # Web app (Next.js 16)
│   ├── desktop/               # Electron desktop client
│   ├── extension/             # Browser extension (git submodule, public repo)
│   ├── backend/               # Deno worker: publish tasks, account refresh
│   └── video-stt-worker/      # Deno worker: video speech-to-text
├── packages/
│   └── shared/                # @multipost/shared: shared types & platform definitions
├── db/                        # Shared Drizzle schema, client, and Atlas migrations
├── prisma/                    # Deploy shim only: migrate_deploy.sh
├── pnpm-workspace.yaml        # Workspace config
└── turbo.json                 # Turborepo task orchestration
```

**Key rules:**
- Web code lives in `apps/web/`
- `apps/extension/` is a **git submodule** pointing to `leaperone/MultiPost-Extension` (public)
- `apps/backend/` and `apps/video-stt-worker/` are Deno-based worker apps inside the monorepo
- `apps/desktop/` is the Electron app with its own `package.json`
- `packages/shared/` exports `@multipost/shared` (types, platform constants)
- root `tsconfig.json` is monorepo-level config; app-specific TS config lives in each app

**Working with the monorepo:**
```bash
pnpm install                        # Install workspace dependencies
pnpm dev                            # Start Web dev server via root orchestrator
pnpm build                          # Build Web project via root orchestrator
cd apps/web && pnpm lint            # Lint Web app directly
cd apps/desktop && pnpm dev         # Start Desktop dev
cd apps/desktop && pnpm build       # Build Desktop
cd apps/backend && deno task dev    # Start backend worker
cd apps/video-stt-worker && deno task dev  # Start video STT worker
```

**Desktop release** (changed 2026-05-26):
1. Bump `apps/desktop/package.json` `version` and commit.
2. Tag `desktop-v0.1.x` on monorepo `main` and push.
3. `.github/workflows/trigger-release-desktop.yml` extracts `v0.1.x` and dispatches `leaperone/MultiPost-Desktop-Release`.
4. The Release repo's `build-on-tag.yml` checks this monorepo out at `desktop-v0.1.x`, runs `pnpm install` at root, then `cd apps/desktop && pnpm build:mac/win/linux --publish always`. Artifacts go to GitHub Releases + S3.

> The old standalone `leaperone/MultiPost-Desktop` repo is **archived**; do not push there. From v0.1.8 onward, releases are cut exclusively from this monorepo.

---

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
make dev                    # Start dev DB + apply Atlas migrations (recommended)
make dbdev                  # Build Drizzle source + apply Atlas migrations

# Manual commands (if needed)
pnpm db:build:source        # Export Drizzle schema to db/atlas/_source.sql
pnpm db:diff                # Generate Atlas migration from Drizzle source
pnpm db:lint                # Atlas migrate lint + no-DML lint
pnpm db:studio              # Open Drizzle Studio
sh prisma/migrate_deploy.sh # Production deploy contract: Atlas migrate apply
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


### Development Database (Docker)
```bash
docker compose -f .devcontainer/dev-db/docker-compose.yml down --volumes postgres-multipost
docker compose -f .devcontainer/dev-db/docker-compose.yml up -d postgres-multipost
```

### Release Management
```bash
pnpm release                # Standard version bump
pnpm release:100            # Major version
pnpm release:010            # Minor version
pnpm release:001            # Patch version
```

## Architecture Overview

**MultiPost** is a Next.js 16 social media publishing platform with browser extension integration.

### Directory Structure

```
apps/web/app/          # Next.js App Router pages and routes
apps/web/actions/      # Server Actions
apps/web/components/   # Reusable React components
apps/web/hooks/        # Custom React hooks
apps/web/i18n/         # Internationalization files
apps/web/lib/          # Web libraries and utilities
apps/web/store/        # Web global state (Zustand)
apps/backend/          # Backend worker and job processing
apps/video-stt-worker/ # Video speech-to-text worker
db/                    # Shared Drizzle schema/client and Atlas migrations
prisma/                # Production migration entrypoint shim only
```

### Core Architecture
- **Next.js App Router**: Modern routing with server/client components
- **NextAuth.js**: Authentication with GitHub, Google, Passkey, and Mailgun providers
- **Drizzle + PostgreSQL + Atlas**: Shared schema/client with Atlas DDL migrations
- **Zustand**: Client-side state management (drafts, publishing, chat history)
- **Credit System**: Built-in payment and usage tracking with Stripe/Alipay integration
- **Worker System**: Background job processing for content publishing and image generation

### Key Components

#### Authentication (`apps/web/auth.ts`)
- Multi-provider auth (GitHub, Google, Passkey, Mailgun)
- Automatic user credit allocation (0.5 for signup, 1.0 for GitHub)
- Custom user session extensions

#### Database (`apps/web/src/lib/db.ts`, `db/`)
- Shared Drizzle schema lives in `db/schema/`; app and worker clients use `db/client.ts`
- Atlas migrations live in `db/atlas/migrations/`; run `pnpm db:build:source` before diffs/lint
- `prisma/migrate_deploy.sh` remains only as the external deploy contract and runs Atlas apply

#### State Management (`apps/web/store/`)
- `draft.store.ts`: Draft creation and publishing platform selection
- `publish.store.ts`: Publishing workflow management
- `chat.history.store.ts`: AI chat history persistence

#### Credit System (`apps/web/actions/credit/`)
- Real-time credit tracking and deduction
- Integration with Stripe and Alipay for recharging
- Usage analytics and admin management
- Centralized pricing configuration in `apps/web/actions/credit/types.ts`

#### Extension Integration (`apps/web/lib/extension/`, `apps/web/app/api/extension/`)
- Browser extension client management
- Task queuing and execution
- Real-time communication via API endpoints

#### Content Publishing (`apps/web/app/dashboard/publish/`)
- Multi-platform publishing (supports various social media platforms)
- Draft management with AI-assisted content creation
- Image generation and media library integration

#### Analytics (`apps/web/app/dashboard/analytics/`)
- Web analytics tracking with custom event collection
- Geographic and device analytics
- Real-time visitor tracking

### Internationalization
- `apps/web/i18n/`: Full i18n support with English and Chinese locales
- Client/server-side translation switching
- Localized UI components throughout

### API Structure
- `apps/web/app/api/`: REST endpoints for extension, analytics, authentication
- `apps/web/actions/`: Server actions for database operations
- Type-safe API contracts with Zod validation

### Development Patterns
- Server actions for data mutations
- Client components for interactive UI
- Drizzle transactions for credit operations
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

### Current Pricing (defined in `apps/web/actions/credit/types.ts`)

**Image Generation**: $0.04 per image
- Implementation: `apps/web/app/dashboard/draw/image/action.ts`, `apps/web/lib/image.ts`
- Formula: `PRICING.IMAGE_GENERATION × number_of_images`

**Poster Generation**: $0.04 per poster
- Implementation: `apps/web/app/dashboard/draw/poster/action.ts`

**AI Text Generation (DeepSeek)**:
- Input: $0.00000027 per token
- Output: $0.0000011 per token
- Implementation: `apps/web/app/api/draft/ai/creation/route.ts`

**Audio Transcription**: $0.000034 per second
- Implementation: `apps/web/app/api/internal/audio/transcriptions/route.ts`

**File Hosting**: $0.04 per GB transfer

### Credit System Architecture
- **Free Credits**: 0.5 (signup), 1.0 (GitHub signup)
- **Paid Credits**: Stripe ($10 min), Alipay ($1 min)
- **Usage Priority**: Free credits first, then paid credits
- **Tracking**: All usage logged in `creditUsage` table with usage types

### Key Pricing Files
- `apps/web/actions/credit/types.ts` - All pricing constants and types
- `apps/web/actions/credit/index.ts` - Credit operations (deduct, add, batch)
- `apps/web/actions/credit/worker.ts` - Worker process credit deduction
- `apps/web/actions/credit/recharge.ts` - Stripe/Alipay recharge functionality

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
- `apps/web/lib/tikhub.ts` - TikHub API client wrapper
- `apps/web/app/api/video/extract/route.ts` - Video extraction endpoint using TikHub

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
/ralph-loop:ralph-loop "@.planning/<the-goal>/*  <引用 plan 后，你来给出prompt，明确目标>" --completion-promise "<FLAG>" --max-iterations 10
```
- 重构类任务: `/ralph-loop:ralph-loop "@.planning/* 重构缓存层，确保所有测试通过" --max-iterations 10`
- 添加功能: `/ralph-loop:ralph-loop "@.planning/* 实现用户头像上传功能，包括前端组件和 API 接口" --completion-promise "功能完成" --max-iterations 10`
- 修复 bug: `/ralph-loop:ralph-loop "@.planning/* 修复登录页面的表单验证问题" --max-iterations 10 --completion-promise "修复完成"`
- 测试相关: `/ralph-loop:ralph-loop "@.planning/* 为 actions/ 目录下的所有 server actions 添加单元测试" --completion-promise "TESTS COMPLETE" --max-iterations 10`

| 参数 | 说明 |
|------|------|
| `--max-iterations <n>` | 最大迭代次数，防止无限循环, default 10 |
| `--completion-promise <text>` | 完成标识，Claude 输出这个文本时停止 |

---
## Marketing Skills 目录

Doc ref: https://github.com/coreyhaines31/marketingskills

当用户有营销增长的问题的时候，推荐使用以下工具。

### 🛠️ 开发类

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `planning-with-files` | Manus 风格的文件规划，用于复杂任务 | `/planning-with-files` |

### 📝 文案/内容类

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `copywriting` | 写营销文案（首页、落地页等） | `/copywriting` |
| `copy-editing` | 编辑和改进现有文案 | `/copy-editing` |
| `humanizer` | 去除 AI 写作痕迹 | `/humanizer` |
| `social-content` | 社交媒体内容创作 | `/social-content` |
| `email-sequence` | 邮件营销序列设计 | `/email-sequence` |

### 📈 CRO（转化率优化）类

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `page-cro` | 页面转化率优化 | `/page-cro` |
| `form-cro` | 表单优化（非注册表单） | `/form-cro` |
| `signup-flow-cro` | 注册流程优化 | `/signup-flow-cro` |
| `onboarding-cro` | 用户激活和引导优化 | `/onboarding-cro` |
| `popup-cro` | 弹窗/模态框转化优化 | `/popup-cro` |
| `paywall-upgrade-cro` | 付费墙和升级页面优化 | `/paywall-upgrade-cro` |

### 🚀 营销策略类

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `marketing-ideas` | 140+ 营销点子 | `/marketing-ideas` |
| `marketing-psychology` | 70+ 营销心理学模型 | `/marketing-psychology` |
| `launch-strategy` | 产品发布策略 | `/launch-strategy` |
| `pricing-strategy` | 定价和打包策略 | `/pricing-strategy` |
| `referral-program` | 推荐计划设计 | `/referral-program` |
| `paid-ads` | 付费广告投放 | `/paid-ads` |
| `free-tool-strategy` | 免费工具营销策略 | `/free-tool-strategy` |
| `ab-test-setup` | A/B 测试设计 | `/ab-test-setup` |
| `competitor-alternatives` | 竞品对比页面 | `/competitor-alternatives` |

### 🔍 SEO 类

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `seo-audit` | SEO 审计和诊断 | `/seo-audit` |
| `programmatic-seo` | 程序化 SEO 页面 | `/programmatic-seo` |
| `schema-markup` | 结构化数据标记 | `/schema-markup` |
| `analytics-tracking` | GA4/GTM 追踪设置 | `/analytics-tracking` |
| `audit-website` | 网站全面审计 | `/audit-website` |

### 🎨 设计类

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `web-design-guidelines` | Web 界面设计规范检查 | `/web-design-guidelines` |
