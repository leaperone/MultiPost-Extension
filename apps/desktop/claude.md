# CLAUDE.md

## Communication Rules

- **🇨🇳 Always respond in Chinese (中文)**
- **Git commit messages in English** - conventional commit format (`feat:`, `fix:`, `chore:`)
- **PR always draft** - `gh pr create --draft`, link relative issues
- **Feature branches** - use `feature/` prefix
- **Never auto commit or push** - only push when explicitly asked

## Project Overview

**Electron + Vite + React + TypeScript** desktop app for multi-platform content publishing.

```
src/
├── main/           # Electron 主进程
│   ├── browser/    # BrowserView 管理
│   ├── ipc/        # IPC 处理器
│   └── platforms/  # 平台适配器 (发布脚本)
├── renderer/       # React 渲染进程
├── preload/        # Preload 脚本 (API 桥接)
└── shared/         # 共享类型和常量
```

```bash
pnpm dev          # 启动开发环境
pnpm build:mac    # 打包 macOS
pnpm build:win    # 打包 Windows
pnpm lint         # 运行 ESLint (开发时用这个检查，不要跑 build)
```

## Development Context

迁移浏览器扩展 (`../MultiPost-Extension`) 和网页端 (`../MultiPost`) 功能到 Electron：
- 参考这两个代码库的做法和用户交互设计
- 利用 Electron 本地化优势，将云端功能改为本地运行
- 使用 BrowserView 实现平台页面嵌入和自动化操作

## UI/Styling Guidelines

设计规范见仓库根目录 **PRODUCT.md / DESIGN.md**(North Star「本地中控台」,桌面端是全产品视觉基准)。

**Component Libraries:** 自研基础件 `src/renderer/src/components/ui/`(shadcn/Radix 风格扁平),Radix UI,Lucide React (icons),Framer Motion,Tailwind CSS,sonner (toast)。**HeroUI 已于 2026-06 全量退役,禁止重新引入 @heroui/***。

**Design System - Minimalist Black & White:**
- Only use Tailwind semantic colors: `bg-background`, `text-foreground`, `text-muted-foreground`
- **The One Red Rule**: 唯一色相是 `text-destructive`,仅用于失败/破坏性;成功用 `text-foreground` 图标+文字;禁 success/warning 彩色
- **The Flat-By-Default Rule**: 静态表面零 shadow;仅 popover/dialog 浮层允许阴影(基础件已内置)
- Borders: Only `border` class, never `border-gray-xxx`
- 字重只用 400/500/600,禁 `font-bold`
- 破坏性操作必须经 `ui/confirm-dialog`(点名对象、说清后果)

**Layout:** Mobile-first, use `flex`/`grid` + `gap` for spacing, avoid margins

**Toast:**
```tsx
import { toast } from './components/ui/sonner'  // 路径按相对层级
toast('已保存草稿')
toast.error('发布失败', { description: '小红书:登录已过期,去账号页重新登录后重试。' })
```

**Icons:** Lucide React, only add `className='size-4'` when button size is 'sm'

## TypeScript Guidelines

- **Always use `interface`** over `type` for object types
- **Avoid `enum`** - use const objects or maps instead
- **Function components only**, early returns for error handling
- Use Zod for form validation
- Comments explain **WHY** not **WHAT**
- "封装成一个组件" → export in the **same file**

## Important Notes

- **pnpm exclusively** (enforced by preinstall hook)
- Node version: `.nvmrc` (v19.7.0)
- ESLint + Prettier, lint-staged + husky for pre-commit

## Electron Architecture

**IPC Communication:**
- 主进程: `ipcMain.handle()` 暴露 API
- 渲染进程: `window.api.*` 调用（preload 定义）
- 通道定义: `src/shared/constants.ts`

**Platform Adapters (`src/main/platforms/`):**
- 专用: `weibo.ts`, `bilibili.ts`, `xiaohongshu.ts`, `douyin.ts`, `twitter.ts`
- 通用: `generic.ts` (50+ 平台)
- 职责: `getFillScript`, `checkLoginStatus`, `submit`

**Security Requirements:**
- Context isolation 必须启用
- Node integration 在渲染进程中禁用
- 使用 Preload 脚本暴露安全的 API
- IPC 通道需要验证输入参数

**Release:** 在 main 分支打 tag 触发构建 → https://github.com/leaperone/MultiPost-Desktop-Release

## planning-with-files & ralph-loop

当用户输入 `planning with files` 时触发 planning-with-files plugin，结果放到 `./.planning/<the-goal>/*`

完成后生成 ralph-loop 启动指令：
```bash
/ralph-loop:ralph-loop "@.planning/<the-goal>/* <prompt>" --completion-promise "<FLAG>" --max-iterations 10
```

| 参数 | 说明 |
|------|------|
| `--max-iterations <n>` | 最大迭代次数，default 10 |
| `--completion-promise <text>` | 完成标识，输出时停止 |
