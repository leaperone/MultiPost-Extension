# Task Plan: 修复 Google AdSense 低质内容问题

## Goal
修复所有可能导致 Google AdSense 拒绝的"低质内容"问题，使网站符合 AdSense 审核标准。

## Current Phase
Phase 1

## 问题概览

| 优先级 | 问题类型 | 数量 | 严重程度 |
|--------|----------|------|----------|
| P0 | 重定向空页面 | 2个公开页面 | 高 |
| P0 | 法律页面 HTML 结构不规范 | 2个文件 | 高 |
| P1 | 缺少 metadata 的公开页面 | 1个文件 | 中 |
| P1 | Schema.org 可能虚假的数据 | 1处 | 中 |
| P2 | 活动中心空状态处理 | 1个文件 | 低 |

---

## Phases

### Phase 1: robots.txt 配置优化（排除问题页面）
- [ ] 更新 `app/robots.ts`，排除重定向空页面
- [ ] 需要排除的路径：
  - `/blog` (重定向到 `/blog/en`)
  - `/docs` (重定向到 `/docs/zh`)
  - `/on-install` (重定向到 `/`)
- **Status:** pending
- **文件:** `app/robots.ts`

**修改方案:**
```typescript
disallow: [
  '/dashboard/',
  '/admin/',
  '/api/',
  '/auth/',
  '/blog',      // 新增：重定向页面
  '/docs',      // 新增：重定向页面
  '/on-install', // 新增：重定向页面
],
```

---

### Phase 2: 法律页面 HTML 结构修复
- [ ] 修复 `app/legal/privacy/page.tsx` 的 HTML 语义结构
- [ ] 修复 `app/legal/terms/page.tsx` 的 HTML 语义结构
- **Status:** pending

**问题详情:**

#### 2.1 隐私政策页面 (`app/legal/privacy/page.tsx`)

| 行号 | 当前代码 | 问题 | 修复方案 |
|------|----------|------|----------|
| 26 | `<p>1.1. ...` | 格式断行 | 合并到上一段或使用列表 |
| 36 | `<p>二、个人信息</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 40 | `<p>三、我们如何收集...</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 79 | `<p>四、我们如何使用...</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 91 | `<p>五、我们如何使用Cookie...</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 95 | `<p>六、我们如何共享...</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 96 | `<p>共享</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 108 | `<p>转让</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 113 | `<p>公开披露</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 118 | `<p>依法豁免...</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 128 | `<p>七、您管理个人信息...</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 141 | `<p>八、我们对您个人信息...</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 142 | `<p>信息储存</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 151 | `<p>信息保护</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 164 | `<p>九、争议解决</p>` | 标题用 p 标签 | 改为 `<h2>` |

#### 2.2 服务条款页面 (`app/legal/terms/page.tsx`)

| 行号 | 当前代码 | 问题 | 修复方案 |
|------|----------|------|----------|
| 25 | `<p>一、服务说明</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 41 | `<p>二、关于账号</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 52 | 缺少 `2.3.` 编号 | 编号不连续 | 添加缺失的编号段落 |
| 65 | `<p>三、用户权利与行为规范</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 101 | `<p>泡泡树洞</p>` | 独立子标题，看起来像占位符 | 改为 `<h3>泡泡树洞功能说明</h3>` |
| 109 | `<p>若您是收稿者</p>` | 子标题用 p 标签 | 改为 `<h4>` |
| 127 | `<p>若您是投稿者</p>` | 子标题用 p 标签 | 改为 `<h4>` |
| 134 | `<p>航海统计及相关服务</p>` | 子标题用 p 标签 | 改为 `<h3>` |
| 146 | `<p>四、增值服务</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 165 | `<p>五、免责声明</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 196 | `<p>六、知识产权</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 209 | `<p>七、违约责任</p>` | 标题用 p 标签 | 改为 `<h2>` |
| 226 | `<p>八、其他</p>` | 标题用 p 标签 | 改为 `<h2>` |

**标签规范:**
- 一级章节标题（一、二、三...）→ `<h2 className="mb-4 mt-8 text-xl font-semibold">`
- 二级子标题（功能名称）→ `<h3 className="mb-3 mt-6 text-lg font-medium">`
- 三级子标题（角色区分）→ `<h4 className="mb-2 mt-4 font-medium">`

---

### Phase 3: 添加缺失的页面 metadata
- [ ] 为 `app/activity/page.tsx` 添加 metadata 导出
- **Status:** pending

**修改方案:**
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '活动中心 | MultiPost',
  description: '参与 MultiPost 活动，完成任务获取免费余额奖励。查看最新的推广活动和奖励信息。',
};
```

---

### Phase 4: 修复 Schema.org 数据
- [ ] 评估 `app/(default)/(home)/page.tsx` 中的 aggregateRating 数据
- [ ] 决策：移除虚假数据 或 标记为示例
- **Status:** pending

**当前代码 (行 42-48):**
```typescript
aggregateRating: {
  '@type': 'AggregateRating',
  ratingValue: '4.8',
  ratingCount: '1250',  // ← 此数据是否真实？
  bestRating: '5',
  worstRating: '1',
},
```

**选项:**
1. **移除 aggregateRating** - 如果没有真实评分数据，完全移除此字段
2. **保留但验证** - 如果有真实数据来源（如 Chrome Web Store 评分），保留并确保准确

**建议:** 移除 aggregateRating，因为虚假的评分数据可能被 Google 视为欺诈性内容。

---

### Phase 5: 改善活动中心空状态体验
- [ ] 修改 `app/activity/components/ActivityList.tsx`，添加空状态 UI
- **Status:** pending

**当前问题:**
- 当 `tasks` 数组为空时，页面显示空白
- 没有提供任何有价值的内容给用户

**修改方案:**
```typescript
if (tasks.length === 0) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold mb-4">暂无活动</h2>
      <p className="text-muted-foreground">
        目前没有进行中的活动，请稍后再来查看。
        您也可以关注我们的官方渠道获取最新活动通知。
      </p>
    </div>
  );
}
```

---

### Phase 6: 验证与测试
- [ ] 运行 `pnpm lint` 确保代码质量
- [ ] 手动检查各页面 HTML 结构
- [ ] 验证 robots.txt 生效（访问 /robots.txt）
- [ ] 检查 metadata 是否正确渲染
- **Status:** pending

---

## Key Questions

1. ❓ Schema.org 的 aggregateRating 数据是否有真实来源？
   - 如果有 → 更新为真实数据
   - 如果没有 → 移除该字段

2. ❓ `/activity` 页面是否应该被 robots.txt 排除？
   - 当前：允许爬取
   - 建议：如果经常为空，考虑排除

3. ❓ 是否需要为其他重定向页面添加 noindex meta tag？
   - `/on-install` - 扩展安装后页面
   - 建议：添加 noindex 或排除

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 使用 robots.txt 排除重定向页面 | 比添加内容更简单，且这些页面本身是技术性重定向 |
| 法律页面使用语义 HTML 标签 | 提高 SEO，使页面结构更清晰，符合无障碍标准 |
| 移除 Schema.org 虚假评分数据 | 避免被 Google 认为是欺诈性内容 |

---

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (暂无) | - | - |

---

## 文件修改清单

| 文件路径 | 修改类型 | Phase |
|----------|----------|-------|
| `app/robots.ts` | 编辑 | 1 |
| `app/legal/privacy/page.tsx` | 编辑 | 2 |
| `app/legal/terms/page.tsx` | 编辑 | 2 |
| `app/activity/page.tsx` | 编辑 | 3 |
| `app/(default)/(home)/page.tsx` | 编辑 | 4 |
| `app/activity/components/ActivityList.tsx` | 编辑 | 5 |

---

## Notes

- 所有修改都应保持现有的 Tailwind CSS 样式约定
- 法律页面内容本身是完整的，只需修复 HTML 结构
- robots.txt 修改会立即生效，但 Google 重新爬取需要时间
- 建议修复后等待 1-2 周再重新申请 AdSense
