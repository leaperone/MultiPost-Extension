# Social Media Client Architecture

这个目录包含了统一的社交媒体平台客户端架构，用于处理不同平台的账户管理、内容发布和状态检查。

## 架构概览

### 基类 (Base Classes)

- **`BaseSocialMediaClient`** - 所有平台客户端的抽象基类
- **`BaseTikTokApiClient`** - TikTok API客户端的基类

### 平台客户端 (Platform Clients)

- **`TikTokClient`** - TikTok平台完整实现
- **`XClient`** - X (Twitter)平台实现

### 工厂 (Factory)

- **`SocialMediaClientFactory`** - 客户端工厂，管理所有平台客户端

## 核心接口

所有平台客户端都必须实现以下三个核心方法：

### 1. `processTask(taskId: string)`

处理发布任务，包括：
- 验证任务状态
- 检查发布时间
- 处理所有待处理的日志
- 更新任务状态

### 2. `processRefreshAccount(accountId: string)`

处理账户刷新，包括：
- 验证访问令牌
- 刷新过期令牌
- 更新账户信息
- 标记账户状态

### 3. `processCheckTask(logId: string, accessToken: string)`

检查任务状态，包括：
- 获取发布状态
- 处理不同的状态值
- 更新日志状态

## 使用方法

### 基本用法

```typescript
import { SocialMediaClientFactory } from './client/factory.ts';

// 获取工厂实例
const factory = SocialMediaClientFactory.getInstance(database);

// 处理特定平台的发布任务
const result = await factory.processTask('task-123', 'tiktok');

// 刷新特定平台的账户
const refreshResult = await factory.processRefreshAccount('account-456', 'x');

// 检查任务状态
const checkResult = await factory.processCheckTask('log-789', 'access-token', 'tiktok');
```

### 批量处理

```typescript
// 处理所有待处理的任务
const results = await factory.processAllPendingTasks('tiktok');

// 处理所有需要刷新的账户
const refreshResults = await factory.processAllAccountsNeededRefresh('x');
```

### 平台支持检查

```typescript
// 检查平台是否支持
if (factory.isPlatformSupported('youtube')) {
  // 处理YouTube相关操作
}

// 获取所有支持的平台
const platforms = factory.getAvailablePlatforms();
```

## 添加新平台

要添加新的社交媒体平台，请按照以下步骤：

### 1. 创建平台客户端类

```typescript
import { BaseSocialMediaClient, TaskProcessingResult } from './base.ts';

export class YouTubeClient extends BaseSocialMediaClient {
  constructor(database: MultipostDb) {
    super(database, 'youtube');
  }

  async processTask(taskId: string): Promise<TaskProcessingResult> {
    // 实现YouTube发布任务处理逻辑
  }

  async processRefreshAccount(accountId: string): Promise<TaskProcessingResult> {
    // 实现YouTube账户刷新逻辑
  }

  async processCheckTask(logId: string, accessToken: string): Promise<TaskProcessingResult> {
    // 实现YouTube状态检查逻辑
  }
}
```

### 2. 在工厂中注册

```typescript
// 在 factory.ts 中
import { YouTubeClient } from './youtube.ts';

private initializeClients(): void {
  // ... 现有客户端
  this.registerClient('youtube', new YouTubeClient(this.db));
}
```

### 3. 导出新客户端

```typescript
// 在 index.ts 中
export * from './youtube.ts';
```

## 错误处理

所有方法都返回 `TaskProcessingResult` 接口，包含：

- `success`: 操作是否成功
- `message`: 操作结果描述
- `data`: 操作返回的数据
- `error`: 错误代码（如果失败）

## 日志记录

客户端使用统一的日志格式：

- 🔄 处理中
- ✅ 成功
- ❌ 错误
- ⚠️ 警告
- 📋 信息
- 🚀 开始操作
- 🎉 完成
- 🔍 检查

## 数据库操作

基类提供了常用的数据库操作方法：

- `getAccount(accountId)` - 获取账户信息
- `getPublishTask(taskId)` - 获取发布任务
- `getPublishTaskLog(logId)` - 获取发布日志
- `updateAccountInfo(accountId, updates)` - 更新账户信息
- `updatePublishTaskLogStatus(logId, status, message, data)` - 更新日志状态
- `markAccountInactive(accountId, reason)` - 标记账户为非活跃

## 扩展性

这个架构设计为高度可扩展：

- 新平台只需实现三个核心方法
- 通用功能在基类中实现
- 工厂模式简化了客户端管理
- 统一的接口和错误处理
- 类型安全的TypeScript实现

## 平台特定文档

- [X (Twitter) 客户端文档](./X_CLIENT_README.md) - X平台的详细使用说明
