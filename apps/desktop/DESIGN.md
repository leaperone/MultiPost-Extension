# MultiPost Desktop Design System

## Stack
HeroUI (@heroui/react) + Tailwind CSS + framer-motion + Lucide React。

## Color
- 仅语义色：`bg-background` `text-foreground` `text-muted-foreground` `bg-muted` `bg-default-50`。
- 中性 tint 用 `bg-foreground/[0.03]`（hover `0.06`），选中态 `bg-primary/10 ring-1 ring-primary/40`。
- 状态色仅语义使用：success=已登录/成功，danger=失败/删除，warning=默认账号徽标。
- 禁止彩色背景、渐变文字、玻璃拟态。

## Surfaces & Depth
- 顶层实体卡：`<Card className="border shadow-none">`，仅一层边框。
- 卡内分组：不再用边框，用 `bg-foreground/[0.03] rounded-xl` tint 或纯间距 + 小标题。
- 空态：`bg-muted rounded-lg`，不加边框（拖拽上传区例外，可用 border-dashed）。
- 嵌套边框 = 违规：Card 内任何 `border` 盒子都应改为 tint 或移除。

## Typography
- 页面标题 `text-2xl font-semibold tracking-tight`；区块标题 `text-sm font-medium`；辅助说明 `text-xs text-muted-foreground`。
- 数字/版本号用 `font-mono`。

## Spacing & Layout
- gap 优先，禁 margin 链；页面级 `gap-5/6`，组内 `gap-2/3`。
- 统计信息用扁平行（数字+标签，分隔符或间距），不用四联同构指标卡。

## Motion
- framer-motion：列表用 stagger（`listContainer`/`listItem` 变体），入场 `opacity + y(8px)`，250–350ms，ease-out。
- 交互反馈：`whileHover={{ y: -2 }}`、`whileTap={{ scale: 0.98 }}`；只动 transform/opacity。
- 状态切换（登录徽标、检测中）允许 spin/pulse 图标，不做布局动画。

## Components
- Toast：`addToast({ title, description, hideIcon: true })`。
- 图标：Lucide，默认尺寸；按钮 size=sm 时 `className='size-4'`。
- 头像：`AccountAvatar`（真实头像 + 平台角标，加载失败回退平台 icon）。
- 平台图标：`PlatformIcon`（favicon + 首字母回退）。
