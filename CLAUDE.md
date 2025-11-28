# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MultiPost is a browser extension that enables one-click content publishing to multiple social media platforms. Built with Plasmo framework, it supports 30+ platforms including Zhihu, Weibo, Xiaohongshu, Bilibili, X, Instagram, and more.

## Development Commands

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Build and package extension for production
pnpm lint         # Run ESLint
pnpm lint:fix     # Auto-fix ESLint issues
```

**Note:** Do not run `pnpm build` for testing during development. Use `pnpm dev` instead.

## Architecture

### Content Types

The extension handles four content types, each with platform-specific implementations:

- **Dynamic** (`src/sync/dynamic/`): Short-form posts (text, images)
- **Article** (`src/sync/article/`): Long-form articles with HTML/Markdown
- **Video** (`src/sync/video/`): Video uploads with metadata
- **Podcast** (`src/sync/podcast/`): Audio content

### Core Data Structures (`src/sync/common.ts`)

- `SyncData`: Main payload containing platforms list, content data, and auto-publish flag
- `PlatformInfo`: Platform configuration including inject URL and function
- `DynamicData`, `ArticleData`, `VideoData`, `PodcastData`: Content-specific interfaces

### Platform Integration Pattern

Each platform has an `injectFunction` that:
1. Opens the platform's publishing page (`injectUrl`)
2. Uses DOM manipulation to fill in content
3. Handles file uploads and form submissions

Platform maps: `DynamicInfoMap`, `ArticleInfoMap`, `VideoInfoMap`, `PodcastInfoMap`

### Extension Components

- **Background** (`src/background/`): Service worker handling message routing, tab management, API services
- **Popup** (`src/popup/`): Extension popup UI
- **Sidepanel** (`src/sidepanel/`): Side panel interface
- **Content Scripts** (`src/contents/`): Page helpers and scrapers
- **Tabs** (`src/tabs/`): Standalone pages (publish, refresh-accounts, trust-domain)

### Message Flow

Background script (`src/background/index.ts`) routes messages:
- `MULTIPOST_EXTENSION_PUBLISH`: Opens publish popup
- `MULTIPOST_EXTENSION_PUBLISH_NOW`: Creates tabs and injects scripts
- `MULTIPOST_EXTENSION_PLATFORMS`: Returns available platforms
- `MULTIPOST_EXTENSION_GET_ACCOUNT_INFOS`: Returns logged-in account info

## Tech Stack

- **Framework**: Plasmo 0.90.5 (Manifest V3)
- **UI**: HeroUI + Tailwind CSS
- **Icons**: lucide-react (prefer over @iconify/react)
- **Storage**: @plasmohq/storage

## Code Conventions

### TypeScript
- Use interfaces over types
- Use maps instead of enums
- Use functional components with TypeScript interfaces
- Naming: PascalCase for components/interfaces, camelCase for functions/variables, SNAKE_CASE for constants

### Styling
- Mobile-first responsive design
- Use `bg-background` and `text-foreground` for theme support
- Use semantic color variables (e.g., `bg-primary-600` not `bg-blue-600`)
- Use `gap` for spacing instead of margins

### i18n
- Store translations in `/locales/[locale]/messages.json`
- Use `chrome.i18n.getMessage('key')` for all UI text
- Default locale: `zh_CN`
- Console.log statements do not need i18n

## Adding a New Platform

1. Create platform handler in appropriate directory (`src/sync/dynamic/`, `src/sync/article/`, etc.)
2. Export inject function that manipulates the platform's DOM
3. Add entry to corresponding InfoMap (e.g., `DynamicInfoMap` in `src/sync/dynamic.ts`)
4. Add account getter in `src/sync/account/` if platform requires login detection
5. Add i18n keys for platform name
