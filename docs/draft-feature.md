# MultiPost 草稿功能 (Beta)

> ⚠️ **历史文档**：本文写于 Next.js + Prisma 时代，文中的代码路径、Prisma schema 示例与框架描述已过时。当前技术栈为 TanStack Start + Drizzle（schema 见 `db/schema/`，web 代码见 `apps/web/src/`），功能描述部分仍可参考。

## 功能概述

MultiPost 的草稿功能允许用户创建、编辑和管理动态内容的草稿，支持实时保存和媒体管理。该功能目前处于 Beta 阶段，提供完整的内容创作工作流程。

## 主要特性

### 1. 草稿管理
- **创建草稿**: 用户可以创建新的动态内容草稿
- **草稿列表**: 查看所有草稿，支持预览和快速操作
- **删除草稿**: 删除不需要的草稿

### 2. 内容编辑
- **标题编辑**: 支持动态标题编辑
- **正文编辑**: 多行文本编辑器，支持长文本内容
- **实时保存**: 编辑内容会在 2 秒后自动保存到服务器
- **保存状态**: 显示保存状态（保存中、未保存更改、已保存）

### 3. 媒体管理
- **图片管理**: 
  - 从图片库选择图片
  - AI 图片生成
  - 拖拽排序
  - 图片预览和删除
- **视频管理**:
  - 视频上传和管理
  - 拖拽排序
  - 视频播放预览

### 4. 发布集成
- **一键发布**: 从草稿直接跳转到发布页面
- **数据传递**: 通过 sessionStorage 将草稿内容传递到发布页面
- **无缝衔接**: 发布页面自动加载草稿数据并清理临时存储

## 数据库设计

### DynamicDraft 模型
```prisma
model DynamicDraft {
  id        String   @id @unique @default(cuid())
  userId    String
  title     String?
  content   String?
  images    Json?    // Array of FileData objects
  videos    Json?    // Array of FileData objects
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
}
```

### 字段说明
- `id`: 草稿唯一标识符
- `userId`: 用户 ID，关联到 User 模型
- `title`: 草稿标题（可选）
- `content`: 草稿正文内容（可选）
- `images`: 图片数据，存储为 JSON 数组
- `videos`: 视频数据，存储为 JSON 数组
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## API 接口

### 草稿操作
所有 API 函数位于 `app/dashboard/publish/action.ts` 文件中：

- `createDynamicDraft()`: 创建新草稿，返回草稿 ID
- `getDynamicDrafts()`: 获取当前用户的所有草稿列表
- `getDynamicDraft(draftId)`: 根据 ID 获取特定草稿详情
- `updateDynamicDraft(draftId, data)`: 更新草稿内容（标题、正文、媒体）
- `deleteDynamicDraft(draftId)`: 删除指定草稿

### 权限验证
- 所有操作都需要用户登录认证
- 用户只能操作自己创建的草稿
- 数据库查询自动过滤用户权限

## 页面路由

### 草稿列表页面
- **路径**: `/dashboard/drafts`
- **文件**: `app/dashboard/(draft)/drafts/page.tsx`
- **功能**: 
  - 显示所有草稿的卡片布局
  - 支持创建、编辑、删除操作
  - 显示草稿预览图、媒体统计、更新时间
  - 空状态处理和加载状态
  - 响应式网格布局

### 草稿编辑页面
- **路径**: `/dashboard/draft/[draftId]`
- **文件**: `app/dashboard/(draft)/draft/[draftId]/page.tsx`
- **功能**: 
  - 标题和正文编辑器
  - 实时自动保存（2秒延迟）
  - 保存状态显示（保存中/未保存更改/已保存）
  - 图片和视频管理，支持拖拽排序
  - 集成图片库选择和 AI 图片生成
  - 媒体预览和删除功能
  - 一键发布到发布页面

## 用户体验

### 自动保存机制
- 用户编辑内容后，系统会在 2 秒的无操作时间后自动保存
- 保存状态会实时显示给用户
- 支持手动保存功能

### 媒体管理
- 支持拖拽排序图片和视频
- 图片支持点击预览
- 媒体文件支持删除操作

### 导航集成
- 在侧边栏添加了 "Drafts (Beta)" 菜单项
- 使用 Next.js 路由组 `(draft)` 实现路径分组
- 支持从草稿直接跳转到发布页面
- 面包屑导航和返回按钮

## 技术实现

### 前端技术栈
- **React**: 组件化开发
- **Next.js**: 服务端渲染和路由
- **TypeScript**: 类型安全
- **HeroUI**: UI 组件库
- **DnD Kit**: 拖拽功能
- **React Player**: 视频播放

### 后端技术栈
- **Prisma**: 数据库 ORM
- **PostgreSQL**: 数据库
- **Next.js API Routes**: 服务端 API

### 状态管理
- **React Hooks**: 本地状态管理（useState, useEffect, useCallback）
- **Session Storage**: 草稿到发布页面的数据传递
- **实时保存**: 使用 useEffect 和 setTimeout 实现防抖自动保存
- **加载状态**: 统一的加载和错误状态管理

## 安全考虑

### 权限控制
- 所有草稿操作都需要用户认证
- 用户只能访问自己的草稿
- 数据库查询包含用户 ID 过滤

### 数据验证
- 服务端验证用户权限
- 客户端表单验证
- 类型安全的数据传递

## 实现历程

### 开发过程
1. **数据库设计**: 创建 DynamicDraft 模型和数据库迁移
2. **后端 API**: 实现草稿 CRUD 操作
3. **前端页面**: 开发草稿列表和编辑页面
4. **路径重构**: 从 `/dashboard/dynamic/` 调整为最终的 `/dashboard/drafts` 和 `/dashboard/draft/[draftId]`
5. **功能完善**: 添加实时保存、媒体管理、发布集成等功能
6. **错误修复**: 解决 TypeScript 类型错误和数据转换问题

### 技术挑战
- **类型安全**: 处理 Prisma Json 类型到 TypeScript 接口的转换
- **实时保存**: 实现防抖机制避免频繁保存
- **媒体管理**: 集成拖拽排序和预览功能
- **路径设计**: 使用 Next.js 路由组实现简洁的 URL 结构

## 未来扩展

### 可能的功能增强
1. **草稿分享**: 允许用户分享草稿给其他用户
2. **版本控制**: 保存草稿的历史版本
3. **标签系统**: 为草稿添加标签分类
4. **搜索功能**: 在草稿中搜索内容
5. **导入导出**: 支持草稿的导入和导出
6. **协作编辑**: 多用户协作编辑草稿
7. **模板系统**: 创建和使用草稿模板
8. **定时发布**: 设置草稿的定时发布

### 性能优化
1. **分页加载**: 草稿列表分页显示
2. **懒加载**: 媒体文件懒加载
3. **缓存策略**: 实现客户端缓存
4. **压缩存储**: 优化 JSON 数据存储
5. **离线支持**: 支持离线编辑和同步 