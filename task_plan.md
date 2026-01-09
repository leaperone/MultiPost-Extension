# 博客迁移任务计划

## 目标
将 `/root/MultiPost-Blog` 中的博客内容迁移到当前项目 `/root/multipost-move-blog`，使用 `/blog/*` 路径访问。

## 确定方案: Fumadocs 集成 ✅

用户选择使用 Fumadocs 方案，因为更加美观。

---

## Fumadocs 方案详细分析

### ✅ 优势

| 优势 | 说明 |
|------|------|
| **零迁移成本** | MDX 文件、frontmatter、组件 100% 兼容，直接复制即可 |
| **美观的 UI** | 内置精美的文档/博客样式，支持深色模式 |
| **完整功能** | 自带 TOC 目录、面包屑、上下篇导航、搜索 |
| **多语言支持** | 原生 i18n 配置，11 种语言无缝迁移 |
| **SEO 优化** | 内置 JSON-LD、OpenGraph、sitemap 生成 |
| **MDX 组件** | 内置 Cards、Callout、Steps、Tabs 等组件 |
| **代码高亮** | 内置 Shiki 语法高亮，支持多种主题 |
| **响应式** | 移动端适配良好 |
| **类型安全** | TypeScript 支持，Zod schema 验证 |

### ❌ 劣势

| 劣势 | 影响程度 | 解决方案 |
|------|----------|----------|
| **增加依赖** | 中 | 3 个包 (~500KB gzip)，可接受 |
| **样式冲突风险** | 低 | Fumadocs 使用 CSS 变量，可隔离到 /blog 路由 |
| **学习成本** | 低 | 文档完善，API 简洁 |
| **构建时间增加** | 低 | MDX 编译增加约 5-10 秒 |
| **版本锁定** | 中 | 需跟随 Fumadocs 更新 |

### 依赖清单
```json
{
  "fumadocs-core": "^15.5.4",   // 核心功能 (loader, i18n, toc)
  "fumadocs-mdx": "^11.6.9",    // MDX 编译和类型生成
  "fumadocs-ui": "^15.5.4"      // UI 组件和样式
}
```

### 与现有项目兼容性

| 方面 | 兼容性 | 说明 |
|------|--------|------|
| Next.js 15 | ✅ 完全兼容 | 源项目使用 15.3.6，目标 15.2.6 |
| Tailwind CSS | ✅ 兼容 | 都使用 Tailwind，只需导入 CSS |
| HeroUI | ✅ 不冲突 | Fumadocs 仅作用于 /blog 路由 |
| i18next | ⚠️ 需整合 | Fumadocs 有独立 i18n，需协调 |
| App Router | ✅ 完全兼容 | 都使用 App Router |

---

## 执行阶段

### Phase 1: 安装与配置
- [ ] 安装 Fumadocs 依赖
- [ ] 创建 `source.config.ts` 配置
- [ ] 配置 `next.config.mjs` (MDX 支持)
- [ ] 添加 postinstall 脚本

### Phase 2: 文件迁移
- [ ] 复制 `content/docs/` → `content/blog/`
- [ ] 创建 `lib/blog-source.ts` (loader)
- [ ] 创建 `lib/blog-i18n.ts` (语言配置)
- [ ] 创建 `mdx-components.tsx`

### Phase 3: 路由实现
- [ ] 创建 `app/blog/layout.tsx`
- [ ] 创建 `app/blog/[lang]/layout.tsx`
- [ ] 创建 `app/blog/[lang]/[[...slug]]/page.tsx`
- [ ] 创建博客首页 (列表页)

### Phase 4: 样式整合
- [ ] 导入 Fumadocs CSS (隔离到 blog)
- [ ] 调整主题配色匹配主站
- [ ] 测试深色模式

### Phase 5: SEO 与完善
- [ ] 配置 metadata 生成
- [ ] 添加 sitemap 条目
- [ ] 配置 robots.txt
- [ ] 测试多语言切换

---

## 文件结构预览

```
multipost-move-blog/
├── content/
│   └── blog/                    # MDX 博客内容 (从源项目复制)
│       ├── introducing-multipost/
│       ├── platforms-introduce/
│       └── ...
├── app/
│   └── blog/
│       ├── layout.tsx           # Blog 布局 (导入 Fumadocs CSS)
│       └── [lang]/
│           ├── layout.tsx       # 语言布局
│           └── [[...slug]]/
│               └── page.tsx     # 博客详情页
├── lib/
│   ├── blog-source.ts           # Fumadocs loader
│   └── blog-i18n.ts             # 博客 i18n 配置
├── source.config.ts             # Fumadocs MDX 配置
└── mdx-components.tsx           # MDX 组件映射
```

---

## 当前状态
- [x] Phase 0: 分析与规划
- [x] 用户确认方案: Fumadocs
- [ ] Phase 1: 安装与配置
- [ ] Phase 2: 文件迁移
- [ ] Phase 3: 路由实现
- [ ] Phase 4: 样式整合
- [ ] Phase 5: SEO 与完善

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | - | - |
