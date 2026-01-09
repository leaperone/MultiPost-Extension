# iOS 26 Liquid Glass 设计规范

> MultiPost Dashboard 设计系统 - 基于 Apple iOS 26 Liquid Glass 设计语言

## 目录

- [设计理念](#设计理念)
- [颜色系统](#颜色系统)
- [玻璃效果](#玻璃效果)
- [组件规范](#组件规范)
- [布局系统](#布局系统)
- [动画规范](#动画规范)
- [图标规范](#图标规范)
- [无障碍](#无障碍)
- [代码示例](#代码示例)

---

## 设计理念

### 核心原则

1. **透明折射** - 界面元素如同玻璃，可透视背景内容
2. **层次分明** - 通过模糊度和透明度区分前景与背景
3. **动态适应** - 根据内容和环境自动调整明暗
4. **圆润流畅** - 大圆角设计，与现代硬件呼应
5. **微妙高光** - 内阴影模拟玻璃边缘反光

### 设计灵感来源

- Apple WWDC 2025 发布的 iOS 26 Liquid Glass
- 强调"A translucent material that reflects and refracts its surroundings"

---

## 颜色系统

### 基础色板

#### 背景色

| 名称 | 亮色模式 | 暗色模式 | 用途 |
|------|---------|---------|------|
| 玻璃背景 | `rgba(255,255,255,0.15)` | `rgba(0,0,0,0.30)` | 卡片、容器 |
| 玻璃背景(强调) | `rgba(255,255,255,0.20)` | `rgba(0,0,0,0.40)` | 悬浮卡片 |
| 玻璃背景(弱化) | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.20)` | 次要容器 |
| 页面遮罩 | `rgba(255,255,255,0.60)` | `rgba(0,0,0,0.60)` | 背景图遮罩 |

#### 边框色

| 名称 | 亮色模式 | 暗色模式 | 用途 |
|------|---------|---------|------|
| 玻璃边框 | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.10)` | 卡片边框 |
| 玻璃边框(强调) | `rgba(255,255,255,0.30)` | `rgba(255,255,255,0.15)` | 悬浮边框 |

#### 语义色

| 名称 | 色值 | Tailwind 类 | 用途 |
|------|------|------------|------|
| Primary | `blue-500` | `text-blue-500` | 主要操作、发布 |
| Secondary | `purple-500` | `text-purple-500` | 次要功能、文档 |
| Success | `green-500` | `text-green-500` | 成功状态 |
| Warning | `amber-500` | `text-amber-500` | 警告、视频 |
| Danger | `pink-500` | `text-pink-500` | 危险、绘图 |
| Default | `slate-500` | `text-slate-500` | 默认、草稿 |

### Tailwind 颜色类

```css
/* 玻璃背景 */
.glass-bg-light { @apply bg-white/15; }
.glass-bg-dark { @apply dark:bg-black/30; }

/* 玻璃边框 */
.glass-border-light { @apply border-white/20; }
.glass-border-dark { @apply dark:border-white/10; }

/* 文字透明度 */
.text-primary { @apply text-foreground/90; }
.text-secondary { @apply text-foreground/70; }
.text-muted { @apply text-foreground/50; }
.text-disabled { @apply text-foreground/30; }
```

---

## 玻璃效果

### 核心 CSS 属性

```css
/* 基础玻璃效果 */
.liquid-glass {
  /* 背景 */
  background: rgba(255, 255, 255, 0.15);

  /* 模糊 + 饱和度增强 */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);

  /* 边框 */
  border: 1px solid rgba(255, 255, 255, 0.20);

  /* 阴影：外阴影 + 内高光 */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);

  /* 圆角 */
  border-radius: 24px;
}

/* 暗色模式 */
.dark .liquid-glass {
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
```

### 模糊等级

| 等级 | 值 | Tailwind 类 | 用途 |
|------|---|------------|------|
| 轻微 | 4px | `backdrop-blur-sm` | 背景遮罩 |
| 标准 | 12px | `backdrop-blur-md` | 次要容器 |
| 强烈 | 16px | `backdrop-blur-lg` | 主要容器 |
| 最强 | 24px | `backdrop-blur-xl` | 卡片、Sidebar |

### 饱和度

| 等级 | 值 | Tailwind 类 | 用途 |
|------|---|------------|------|
| 标准 | 150% | `backdrop-saturate-150` | 大部分场景 |
| 强烈 | 180% | `backdrop-saturate-[1.8]` | 强调效果 |

---

## 组件规范

### 卡片 (Card)

#### 默认卡片

```tsx
<LiquidGlassCard className="p-6">
  {/* 内容 */}
</LiquidGlassCard>
```

**样式规范：**
- 圆角: `24px` (`rounded-3xl`)
- 内边距: `24px` (桌面) / `16px` (移动)
- 背景: `bg-white/15 dark:bg-black/30`
- 边框: `border border-white/20 dark:border-white/10`
- 阴影: 外阴影 + 内高光

#### 交互卡片

```tsx
<LiquidGlassMotionCard interactive className="p-6">
  {/* 可点击内容 */}
</LiquidGlassMotionCard>
```

**交互效果：**
- 悬浮: `scale(1.02)` + `translateY(-4px)`
- 点击: `scale(0.98)`
- 过渡: `spring` 动画，`stiffness: 400`, `damping: 25`

#### 卡片变体

| 变体 | 背景透明度 | 用途 |
|------|-----------|------|
| `default` | 15% / 30% | 标准卡片 |
| `elevated` | 20% / 40% | 悬浮卡片、强调 |
| `flat` | 10% / 20% | 次要容器 |

---

### 按钮 (Button)

#### 玻璃按钮

```tsx
<LiquidGlassButton size="md" variant="default">
  按钮文字
</LiquidGlassButton>
```

**尺寸规范：**

| 尺寸 | 高度 | 内边距 | 字号 | 圆角 |
|------|------|--------|------|------|
| `sm` | 32px | `12px 16px` | 14px | 12px |
| `md` | 40px | `16px 20px` | 16px | 16px |
| `lg` | 48px | `20px 24px` | 18px | 16px |

**变体：**

| 变体 | 背景 | 用途 |
|------|------|------|
| `default` | 白色 20% | 标准操作 |
| `primary` | 蓝紫渐变 80% | 主要操作 |
| `ghost` | 透明 | 次要操作 |

---

### 图标容器 (Icon Container)

```tsx
<LiquidGlassIconContainer size="xl" color="primary">
  <SendIcon className="size-14" />
</LiquidGlassIconContainer>
```

**尺寸规范：**

| 尺寸 | 容器大小 | 图标大小 | 用途 |
|------|---------|---------|------|
| `sm` | 48px | 20px | 列表项 |
| `md` | 64px | 24px | 卡片 |
| `lg` | 96px | 40px | 功能入口 |
| `xl` | 128px | 56px | Dashboard 主卡片 |

**颜色：**

| 颜色 | 背景 | 用途 |
|------|------|------|
| `default` | 白色 20% | 默认 |
| `primary` | 蓝色 20% | 发布 |
| `secondary` | 紫色 20% | 文档 |
| `success` | 绿色 20% | 成功 |
| `warning` | 琥珀色 20% | 警告 |
| `danger` | 红色 20% | 危险 |

---

### 输入框 (Input)

```tsx
<Input
  className="bg-white/10 dark:bg-black/20 backdrop-blur-md border-white/20"
  placeholder="请输入..."
/>
```

**样式规范：**
- 背景: 半透明玻璃
- 边框: 玻璃边框，聚焦时加深
- 圆角: `12px` (`rounded-xl`)
- 高度: `40px` (标准) / `48px` (大号)

---

### Sidebar

```tsx
<Sidebar variant="floating" collapsible="icon">
  {/* 内容 */}
</Sidebar>
```

**样式规范：**
- 变体: `floating` (悬浮玻璃效果)
- 背景: `bg-sidebar` (CSS 变量，透明)
- 模糊: `backdrop-blur-xl backdrop-saturate-150`
- 圆角: `16px` (`rounded-2xl`)
- 阴影: 玻璃阴影 + 内高光

---

## 布局系统

### 页面结构

```tsx
<div className="relative h-full overflow-y-auto">
  {/* 固定背景 */}
  <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage }} />

  {/* 固定遮罩 */}
  <div className="fixed inset-0 bg-white/60 backdrop-blur-sm dark:bg-black/60" />

  {/* 固定装饰光晕 */}
  <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute ... bg-blue-400/20 blur-3xl" />
    <div className="absolute ... bg-purple-400/20 blur-3xl" />
  </div>

  {/* 滚动内容 */}
  <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
    {/* 页面内容 */}
  </div>
</div>
```

### 网格系统

```tsx
/* 卡片网格 */
<div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
  {/* 卡片 */}
</div>
```

**响应式断点：**

| 断点 | 宽度 | 列数 | 间距 |
|------|------|------|------|
| 默认 | < 640px | 1 | 16px |
| `sm` | ≥ 640px | 2 | 24px |
| `lg` | ≥ 1024px | 3 | 32px |

### 间距规范

| 名称 | 值 | 用途 |
|------|---|------|
| `space-xs` | 4px | 紧凑元素 |
| `space-sm` | 8px | 相关元素 |
| `space-md` | 16px | 标准间距 |
| `space-lg` | 24px | 区块间距 |
| `space-xl` | 32px | 大区块 |
| `space-2xl` | 48px | 页面区块 |

---

## 动画规范

### Framer Motion 配置

```tsx
// 卡片悬浮
const hoverAnimation = {
  whileHover: { scale: 1.02, y: -4 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 400, damping: 25 }
};

// 进入动画（交错）
const staggerAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.1, duration: 0.5, ease: 'easeOut' }
};

// 背景光晕动画
const orbAnimation = {
  animate: {
    x: [0, 30, 0],
    y: [0, 20, 0],
  },
  transition: {
    duration: 8,
    repeat: Infinity,
    ease: 'easeInOut',
  }
};
```

### 过渡时间

| 类型 | 时长 | 用途 |
|------|------|------|
| 快速 | 150ms | 按钮状态 |
| 标准 | 300ms | 卡片悬浮 |
| 慢速 | 500ms | 页面过渡 |
| 背景 | 6-10s | 装饰动画 |

### 缓动函数

| 名称 | 值 | 用途 |
|------|---|------|
| `easeOut` | `cubic-bezier(0, 0, 0.2, 1)` | 进入动画 |
| `easeInOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | 循环动画 |
| `spring` | `stiffness: 400, damping: 25` | 交互反馈 |

---

## 图标规范

### 图标库

使用 **Lucide React** 作为主要图标库。

```tsx
import { SendIcon, FileTextIcon, PaletteIcon } from 'lucide-react';
```

### 图标尺寸

| 场景 | 尺寸 | Tailwind 类 |
|------|------|------------|
| 按钮内 | 16px | `size-4` |
| 按钮内 (sm) | 16px | `size-4` |
| 列表项 | 20px | `size-5` |
| 卡片标题 | 24px | `size-6` |
| 功能卡片 | 40-56px | `size-10 sm:size-14` |

### 图标颜色

```tsx
// 功能图标（在 IconContainer 内）
<SendIcon className="size-14 text-blue-500 dark:text-blue-400" />

// 操作图标（在按钮内）
<SettingsIcon className="size-5" /> // 继承按钮颜色
```

---

## 无障碍

### 对比度要求

| 元素 | 最低对比度 | 推荐 |
|------|-----------|------|
| 正文文字 | 4.5:1 | 7:1 |
| 大号文字 | 3:1 | 4.5:1 |
| 图标 | 3:1 | 4.5:1 |

### 文字透明度指南

```tsx
// ✅ 推荐：高对比度
<h1 className="text-foreground/90">标题</h1>
<p className="text-foreground/70">正文</p>

// ⚠️ 谨慎使用：低对比度
<span className="text-foreground/50">次要信息</span>

// ❌ 避免：过低对比度
<span className="text-foreground/30">难以阅读</span>
```

### 减少动画

```tsx
// 支持 prefers-reduced-motion
<motion.div
  animate={prefersReducedMotion ? {} : { x: [0, 30, 0] }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 8 }}
/>
```

### 键盘导航

- 所有交互元素必须可聚焦
- 使用 `tabIndex` 管理焦点顺序
- 提供 `focus-visible` 样式

```tsx
<button className="focus-visible:ring-2 focus-visible:ring-primary">
  操作
</button>
```

---

## 代码示例

### 完整卡片示例

```tsx
import { LiquidGlassMotionCard, LiquidGlassIconContainer } from '@/components/ui/liquid-glass';
import { SendIcon } from 'lucide-react';

function FeatureCard({ title, description, icon, href }) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}>
      <LiquidGlassMotionCard className="group h-full p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6">
          <LiquidGlassIconContainer
            size="xl"
            color="primary"
            className="transition-transform duration-300 group-hover:scale-110">
            {icon}
          </LiquidGlassIconContainer>

          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold text-foreground/90">
              {title}
            </h3>
            <p className="text-base text-foreground/50">
              {description}
            </p>
          </div>
        </div>
      </LiquidGlassMotionCard>
    </motion.a>
  );
}
```

### 页面布局示例

```tsx
export default function ExamplePage() {
  return (
    <div className="relative h-full overflow-y-auto">
      {/* 背景 */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed inset-0 bg-white/60 backdrop-blur-sm dark:bg-black/60" />

      {/* 装饰光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 size-96 rounded-full bg-blue-400/20 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* 内容 */}
      <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-foreground/90">页面标题</h1>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* 卡片内容 */}
        </div>
      </div>
    </div>
  );
}
```

---

## 组件导入

```tsx
// Liquid Glass 组件
import {
  LiquidGlassCard,
  LiquidGlassButton,
  LiquidGlassContainer,
  LiquidGlassIconContainer,
  LiquidGlassMotionCard,
  GlassBackground,
  glassBaseStyles,
} from '@/components/ui/liquid-glass';

// 基础样式类（用于自定义组件）
import { glassBaseStyles } from '@/components/ui/liquid-glass';

// 在自定义组件中使用
<div className={cn(glassBaseStyles, 'rounded-xl p-4')}>
  自定义玻璃效果
</div>
```

---

## 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| `backdrop-filter` | ✅ 76+ | ✅ 103+ | ✅ 9+ | ✅ 79+ |
| `backdrop-blur` | ✅ | ✅ | ✅ | ✅ |
| `backdrop-saturate` | ✅ | ✅ | ✅ | ✅ |

**注意：** 旧版浏览器会降级显示为半透明背景（无模糊）。

---

## 参考资源

- [Apple Newsroom - Liquid Glass](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [Liquid Glass 组件源码](/components/ui/liquid-glass.tsx)
- [Dashboard 示例](/app/dashboard/page.tsx)

---

*最后更新: 2026-01-09*
