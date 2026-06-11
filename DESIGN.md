---
name: MultiPost
description: 多平台内容一键分发工具的桌面端优先设计体系
colors:
  ink: "#171717"
  paper: "#ffffff"
  paper-dark: "#0a0a0a"
  mist: "#f5f5f5"
  quiet-text: "#737373"
  hairline: "#e5e5e5"
  sidebar-haze: "#fafafa"
  alert-red: "#ef4444"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sidebar-haze}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#2e2e2e"
    textColor: "{colors.sidebar-haze}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.mist}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  tag-chip:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "2px 10px"
  sidebar-item-active:
    backgroundColor: "#f0f0f1"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: MultiPost

## 1. Overview

**Creative North Star: "本地中控台 (The Local Cockpit)"**

MultiPost 的界面是一座安静、可托付的本地中控台:创作者坐进来,多平台、多账号的发布状态尽收眼底,填一次表单,确认,走人。它的气质来自克制的灰阶秩序,温度来自文案、引导和出错时刻的体贴,而不是颜色和装饰。界面永远退后,用户的标题、封面、正文才是主角。

**桌面端(Electron renderer)的视觉语言是整个产品的基准。** Web 工作台向桌面端靠拢,而非相反。本体系明确拒绝(引自 PRODUCT.md 的反面参考):国内营销后台风的彩色图标堆砌与弹窗轰炸、过度极客风的终端美学、玩具感的果冻色卡通风。

**Key Characteristics:**

- 纯灰阶 + 单一功能红,状态靠图标与文字而非色块
- 全扁平表面,1px hairline 分隔,浮层才允许阴影
- 系统字体栈,桌面原生感
- 高密度但不拥挤:gap 布局,无 margin 间距
- 组件目标形态是 shadcn/Radix 原生扁平,HeroUI 处于退役通道

## 2. Colors

调色板是一支铅笔:墨色、灰阶、纸面,唯一的颜色留给不可忽视的警示。

### Primary

- **墨色 Ink** (#171717): 主按钮底色、正文标题、主行动的颜色。整个系统唯一的「重」。
- **纸面 Paper** (#ffffff / 暗色 #0a0a0a): 画布本身。暗色模式整体反转,token 自动跟随。

### Neutral

- **薄雾 Mist** (#f5f5f5): secondary/muted/accent 三位一体的浅灰,hover 态、标签底、代码块底。
- **静默文本 Quiet Text** (#737373): 辅助说明、占位符、时间戳。muted-foreground。
- **发丝线 Hairline** (#e5e5e5): 全部边框与分隔线。只有这一种边框色。
- **侧栏霾 Sidebar Haze** (#fafafa): 侧栏背景,与画布形成最轻的层次差。

### Tertiary

- **警示红 Alert Red** (#ef4444): destructive 专用,删除确认、发布失败。系统里唯一的色相。

### Named Rules

**The One Red Rule.** 警示红是整个界面唯一允许的色相,且只用于破坏性操作与失败状态。任务状态(等待/进行中/成功/失败)用 Lucide 图标 + 文字表达,禁止引入琥珀/蓝/绿的状态色块。平台品牌图标是唯一的例外彩色来源。

**The Semantic-Only Rule.** 颜色只能通过 Tailwind 语义 token 引用(`bg-background`、`text-foreground`、`text-muted-foreground`、`border`)。`border-gray-300`、`bg-slate-50` 一类原始色阶类名一律禁止。

## 3. Typography

**Body Font:** 系统字体栈(-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)
**Mono Font:** ui-monospace, SFMono-Regular, Menlo, monospace(仅代码、日志、ID)

**Character:** 不引入品牌字体,完全交给操作系统渲染。桌面原生感本身就是设计表达:界面像系统自带的工具,而非网页。

### Hierarchy

- **Headline** (600, 1.25rem, 1.4): 页面级标题,一屏最多一个。
- **Title** (600, 1rem, 1.4): 区块标题、卡片标题、对话框标题。
- **Body** (400, 0.875rem, 1.6): 默认正文。表单、列表、说明全部使用。
- **Label** (500, 0.75rem, 1.4): 表单标签、侧栏分组名、状态文字。
- **Mono** (400, 0.8125rem): 仅日志输出、错误详情、技术标识。

### Named Rules

**The Two-Weight Rule.** 层级靠 400/600 两档字重加尺寸表达。避免 300 细体与 700+ 粗体;需要更强调时放大尺寸,不加粗到黑。

## 4. Elevation

系统默认零阴影:静态表面(卡片、表单区、列表)一律扁平,靠 1px hairline 边框和 Mist/Sidebar Haze 的微弱底色差表达层次。阴影是「浮起」这一物理事实的专属信号。

### Shadow Vocabulary

- **浮层影 Floating** (`box-shadow: 0 4px 16px rgb(0 0 0 / 0.08)`): 仅 popover、dropdown、dialog、context menu 等真正脱离文档流悬浮的层。

### Named Rules

**The Flat-By-Default Rule.** 任何静态表面出现 box-shadow 都是错误。卡片写法固定为 `shadow-none border`。只有会消失的浮层才配得上影子。

## 5. Components

组件的目标形态:shadcn 风格原生实现(Radix 行为 + Tailwind 语义色),手感扁平、克制、桌面原生。存量 HeroUI 组件按页面逐步替换;**新代码禁止新增 HeroUI 引用**。

### Buttons

- **Shape:** 中圆角(6px)
- **Primary:** 墨色底(#171717)+ 近白文字,padding 8px 16px;一屏一个主行动
- **Ghost / Secondary:** 透明底或 Mist 底,hover 转 Mist(#f5f5f5)
- **Hover / Focus:** 背景色 0.15s ease-out 过渡;焦点用 2px ring(foreground 色)
- **Destructive:** 警示红仅在确认删除等终点动作出现

### Cards / Containers

- **Corner Style:** 8px
- **Background:** Paper(#ffffff)
- **Border:** 1px Hairline(#e5e5e5),固定写法 `shadow-none border`
- **Internal Padding:** 16px;不准嵌套卡片

### Inputs / Fields

- **Style:** Paper 底 + 1px Hairline 边,6px 圆角;表单区整体不额外加边框
- **Focus:** 边框转 foreground 色或 2px ring,无 glow
- **Error:** 警示红边框 + 图标 + 可行动的文字说明,不只变红

### Chips / Tags

- **Style:** Mist 底、墨色文字、全圆角胶囊,带 X 可删除(参照 TagInput:回车/逗号确认,空输入退格删除末项)

### Navigation (Sidebar)

- **Style:** Sidebar Haze 底(#fafafa),1px hairline 右分隔
- **Item:** 6px 圆角,hover/active 转浅灰底(#f0f0f1),active 不用色条不用左侧 stripe
- **Group Label:** Label 字级、Quiet Text 色

### 发布状态行 (signature)

产品的灵魂组件:每个账号一行,Lucide 状态图标(Circle 等待 / Loader2 旋转进行中 / CheckCircle 成功 / XCircle 失败)+ 平台图标 + 账号名 + 状态文字。失败行附带原因和重试入口。状态永远靠图标 + 文字,绝不靠背景色块。

## 6. Do's and Don'ts

### Do:

- **Do** 以桌面端(apps/desktop renderer)的视觉语言为基准;Web 向桌面靠拢。
- **Do** 固定卡片写法 `shadow-none border`,层次靠 hairline 和底色差。
- **Do** 用 Lucide 图标 + 文字表达一切状态;失败信息必须包含原因与下一步。
- **Do** 用 `flex`/`grid` + `gap` 布局,移动优先;不用 margin 做元素间距。
- **Do** 新组件按 shadcn/Radix 原生扁平实现,语义 token 引色。

### Don't:

- **Don't** 新增任何 HeroUI(@heroui/react)引用;存量按页替换,逐步退役。
- **Don't** 长成「国内营销后台风」:彩色图标堆砌、跑马灯公告、营销弹窗。
- **Don't** 滑向「过度极客风」:满屏等宽字体、纯黑终端美学。
- **Don't** 出现「玩具感/卡通风」:大圆角果冻色、表情包式插画。
- **Don't** 使用原始色阶类名(border-gray-xxx、bg-blue-50)或除警示红之外的任何状态色块。
- **Don't** 给静态表面加 box-shadow、给卡片嵌套卡片、用 border-left 色条做强调。
- **Don't** 用渐变文字(background-clip: text)或大数字指标卡的 SaaS 模板套路。
