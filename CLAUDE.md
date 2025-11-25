# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
MultiPost is a Chrome extension for cross-platform content publishing, supporting multiple Chinese social media platforms including video and article publishing.

## Tech Stack
- **Framework**: Plasmo (Chrome Extension Manifest V3)
- **Language**: TypeScript
- **UI**: React with Hero UI components
- **Styling**: Tailwind CSS
- **Build Tools**: Plasmo CLI
- **Package Manager**: pnpm (required - do not use npm)

## Architecture
- Content scripts for platform integration
- Background service worker for core logic
- Popup UI for user interaction
- Storage management with @plasmohq/storage
- Platform-specific implementations in `src/sync/`

## Platform Integration Structure
The codebase follows a modular architecture for platform integration:

### Core Files
- `src/sync/common.ts` - Shared types and platform registry
- `src/sync/account.ts` - Account info management
- `src/sync/article.ts` - Article platform registry
- `src/sync/video.ts` - Video platform registry
- `src/sync/dynamic.ts` - Dynamic content platform registry
- `src/sync/podcast.ts` - Podcast platform registry

### Platform Implementation Pattern
Each platform follows this structure:
- `src/sync/account/[platform].ts` - Account info retrieval
- `src/sync/video/[platform].ts` - Video upload implementation
- `src/sync/article/[platform].ts` - Article publishing implementation
- `src/sync/dynamic/[platform].ts` - Dynamic content posting

### Data Types
```typescript
interface VideoData {
  title: string;
  content: string;
  video: FileData;
  tags?: string[];
  cover?: FileData;
  verticalCover?: FileData;
  scheduledPublishTime?: number;
}

interface AccountInfo {
  provider: string;
  accountId: string;
  username: string;
  description?: string;
  profileUrl?: string;
  avatarUrl?: string;
  extraData: unknown;
}
```

## Critical Development Constraints
- **NEVER use dynamically generated CSS classes** for element selection (user explicitly banned)
- **Always distinguish between video and image upload inputs** - avoid filling video files into image inputs
- **Do not modify accept attributes** of file inputs
- **Use proper TypeScript typing** and casting with `(window as any)`
- **Handle async operations** with proper error boundaries
- **Use scientific approach** - analyze page structure rather than guessing
- **Internationalization support** - add new platform names to both `locales/zh_CN/messages.json` and `locales/en/messages.json`

## Video Upload Implementation Best Practices
Based on platform-specific analysis:

### Upload Workflow
1. **Page Navigation** - Navigate to platform's upload page
2. **Form Filling** - Fill title, description, and other metadata
3. **File Upload** - Handle video file upload using appropriate method:
   - Direct file input filling with DataTransfer API
   - Platform-specific uploader integration (AHVP, browser_0_, etc.)
   - Event triggering for upload initiation
4. **Error Handling** - Multiple fallback strategies

### File Upload Patterns
```typescript
// Avoid: Finding video inputs by accept attributes
// Accept: .jpg,.jpeg,.png may be for cover images

// Recommended: Scientific approach based on platform analysis
const fileInputs = document.querySelectorAll('input[type="file"]');
const dataTransfer = new DataTransfer();
dataTransfer.items.add(videoFile);
fileInput.files = dataTransfer.files;
```

## Platform Addition Process
1. Create account info file: `src/sync/account/[platform].ts`
2. Create implementation file: `src/sync/video/[platform].ts` or `src/sync/article/[platform].ts`
3. Add platform to registry in respective `.ts` file
4. Add i18n entries to both locale files
5. Update platform configuration

## File Structure
```
src/
├── components/          # Reusable React components
├── hooks/              # Custom React hooks
├── pages/              # Extension pages (popup, options, etc.)
├── sync/               # Platform integration logic
│   ├── account/        # Platform account info retrievers
│   ├── article/        # Article publishing implementations
│   ├── video/          # Video upload implementations
│   ├── dynamic/        # Dynamic content posting
│   ├── podcast/        # Podcast publishing
│   ├── common.ts       # Shared types and platform registry
│   ├── account.ts      # Account management
│   ├── article.ts      # Article platform registry
│   ├── video.ts        # Video platform registry
│   ├── dynamic.ts      # Dynamic platform registry
│   └── podcast.ts      # Podcast platform registry
├── store/              # State management
└── styles/             # Global styles
locales/                # i18n message files
├── en/messages.json    # English translations
└── zh_CN/messages.json # Chinese translations
```

## Build Commands
```bash
pnpm run dev       # Development mode (watch mode)
pnpm run build     # Build and package extension
pnpm run package   # Package extension only
pnpm run lint      # Run ESLint
pnpm run lint:fix  # Fix ESLint auto-fixable issues
pnpm run lint:staged # Run lint-staged for git hooks
pnpm run prepare   # Setup husky git hooks
```

## UI and Styling Standards
- Use **HeroUI and Tailwind CSS** for components and styling
- Use **lucide-react** for icons
- Implement **mobile-first responsive design** with Tailwind
- Use **semantic color variables** (bg-primary-600 not bg-blue-600)
- Use **gap instead of margin** for element spacing
- Implement proper ARIA labels for accessibility

```tsx
// ✅ Correct layout
<div className="flex gap-4">

// ❌ Incorrect layout
<div className="flex [&>*]:mr-4">
```

## Internationalization (i18n)
- Store all UI text in `/locales/[locale]/messages.json`
- Use **camelCase** for message keys: `errorImportingContent`
- Include **descriptions** for translators in message files
- Add new text to both `locales/zh_CN/messages.json` and `locales/en/messages.json`
- Use `chrome.i18n.getMessage('key')` in components
- **Console.log messages don't need i18n** - only UI text

```json
{
  "extensionDisplayName": {
    "message": "MultiPost",
    "description": "Extension display name"
  }
}
```

## TypeScript Development Standards
- Use **interfaces over types** for defining shapes
- Avoid enums; use maps instead
- Follow functional programming patterns; **avoid classes**
- Use **descriptive variable names** with auxiliary verbs (isLoading, hasError, fetchUserData)
- Implement **early returns and guard clauses** for error handling
- Use TypeScript interfaces for component props
```typescript
// ✅ Correct naming
const isLoading = true;
const hasError = false;
const fetchUserData = async () => {};

// ✅ Correct error handling
function processUserData(data?: UserData) {
  if (!data) return null;
  if (!data.email) return { error: "Email required" };
  return processData(data);
}
```

## Current Platform Support
- **Article Platforms**: WeChat Subscription Account, Weibo, Zhihu, Bilibili, Toutiao, CSDN, Jianshu, Juejin, etc.
- **Video Platforms**: Bilibili, Douyin, Weibo, Kuaishou, QiEHao, Chejiahao, TikTok, etc.
- **Dynamic Platforms**: Weibo, Zhihu, Douyin, Xiaohongshu, etc.
- **Podcast Platforms**: Lizhi, QQ Music

## Code Commenting Standards
- **Comment WHY, not WHAT** - Explain business logic, not implementation
- Use **JSDoc-style comments** for functions and interfaces
- Add **file header comments** with description and author
- Use **TODO/FIXME tags** with issue references
- Keep comments concise and up-to-date

```typescript
/**
 * @file Video upload handler for platform integration
 * @description Manages video file uploads across different social platforms
 * @author leaperone
 */

// ✅ Good comment: explains complex logic
if (user.role === 'admin' && !isHoliday) {
  // 管理员在非假日期间具有特殊权限
  grantSpecialAccess();
}

// ❌ Bad comment: states the obvious
// 检查用户是否为管理员
if (user.role === 'admin') {
  // ...
}
```

## Known Issues & Solutions
- **Video Upload Input Detection**: Carefully filter image vs video inputs to avoid wrong file placement
- **ESLint Requirements**: Use `/* eslint-disable */` for complex DOM manipulation
- **File Upload Timing**: Some platforms require specific initialization sequences
- **Platform-specific Uploaders**: Each platform may have unique uploader integration (AHVP, browser_0_, etc.)