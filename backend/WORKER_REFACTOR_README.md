# Worker 重构说明

本文档说明如何使用重构后的worker文件，这些worker现在使用新的统一客户端架构。

## 重构概述

我们将原来的worker文件重构为使用新的客户端架构：

- **`process_publish_task_worker.ts`** - 使用客户端工厂处理发布任务
- **`refresh_account_worker.ts`** - 使用客户端工厂刷新账户
- **`check_publish_task_worker.ts`** - 使用客户端工厂检查任务状态

## 主要变化

### 1. 统一客户端架构
- 所有worker现在使用 `SocialMediaClientFactory` 来获取平台客户端
- 不再直接导入特定平台的客户端
- 支持动态平台检测和路由

### 2. 平台无关性
- Worker代码不再硬编码特定平台逻辑
- 可以轻松添加新平台支持
- 统一的错误处理和状态管理

### 3. 增强功能
- 添加了按平台处理任务的方法
- 更好的错误处理和日志记录
- 支持批量操作

## 使用方法

### PublishTaskWorker

#### 基本用法
```typescript
import { PublishTaskWorker } from './process_publish_task_worker.ts';

const worker = new PublishTaskWorker(database);

// 处理单个发布任务
await worker.processPublishTask('task-id');

// 处理所有待处理任务
await worker.processAllPendingTasks();

// 处理特定平台的待处理任务
await worker.processAllPendingTasksForPlatform('tiktok');
await worker.processAllPendingTasksForPlatform('x');
```

#### 新增方法
- `processAllPendingTasksForPlatform(platform)` - 处理特定平台的所有待处理任务

### RefreshAccountWorker

#### 基本用法
```typescript
import { RefreshAccountWorker } from './refresh_account_worker.ts';

const worker = new RefreshAccountWorker(database);

// 刷新单个账户
await worker.refreshAccount('account-id');

// 刷新所有需要刷新的账户
await worker.processAllAccountsNeedingRefresh();

// 刷新特定平台的所有需要刷新的账户
await worker.processAllAccountsNeedingRefreshForPlatform('tiktok');
await worker.processAllAccountsNeedingRefreshForPlatform('x');
```

#### 新增方法
- `processAllAccountsNeedingRefreshForPlatform(platform)` - 刷新特定平台的所有需要刷新的账户

### CheckPublishStatusWorker

#### 基本用法
```typescript
import { CheckPublishStatusWorker } from './check_publish_task_worker.ts';

const worker = new CheckPublishStatusWorker(database);

// 检查单个日志的状态
await worker.checkAndUpdatePublishStatus('log-id', 'access-token', 'platform');

// 处理所有处理中的日志
await worker.processAllProcessingLogs();

// 处理特定任务的日志
await worker.processPublishTaskLogs('task-id');

// 处理特定平台的所有处理中的日志
await worker.processAllProcessingLogsForPlatform('tiktok');
await worker.processAllProcessingLogsForPlatform('x');
```

#### 新增方法
- `processAllProcessingLogsForPlatform(platform)` - 处理特定平台的所有处理中的日志

## 平台支持

### 当前支持的平台
- **TikTok** (`tiktok`) - 完整支持
- **X (Twitter)** (`x`) - 完整支持

### 添加新平台
要添加新平台，只需：

1. 创建继承自 `BaseSocialMediaClient` 的客户端类
2. 实现三个核心方法
3. 在工厂中注册新客户端
4. Worker会自动支持新平台

## 错误处理

### 统一错误响应
所有客户端方法都返回 `TaskProcessingResult` 接口：

```typescript
interface TaskProcessingResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}
```

### 错误类型
- `TASK_NOT_FOUND` - 任务未找到
- `INVALID_STATUS` - 无效状态
- `NOT_SCHEDULED` - 未到发布时间
- `ACCOUNT_NOT_FOUND` - 账户未找到
- `NO_REFRESH_TOKEN` - 缺少刷新令牌
- `NO_ACTIVE_ACCOUNT` - 没有活跃账户
- `UNSUPPORTED_PLATFORM` - 不支持的平台

## 性能优化

### 批量处理
- 使用 `processAllPendingTasksForPlatform()` 批量处理特定平台任务
- 使用 `processAllAccountsNeedingRefreshForPlatform()` 批量刷新特定平台账户
- 使用 `processAllProcessingLogsForPlatform()` 批量检查特定平台状态

### 并发控制
- 每个worker都有自己的任务管理器
- 防止重复处理同一任务
- 支持任务队列和状态跟踪

## 监控和日志

### 日志格式
- 🔄 处理中
- ✅ 成功
- ❌ 错误
- ⚠️ 警告
- 📋 信息
- 🚀 开始操作
- 🎉 完成
- 🔍 检查

### 状态跟踪
- 实时任务状态更新
- 详细的错误信息记录
- 性能指标统计

## 迁移指南

### 从旧版本迁移
1. 更新导入语句，使用新的worker类
2. 移除平台特定的代码
3. 使用新的方法名称和参数
4. 更新错误处理逻辑

### 示例迁移
```typescript
// 旧版本
import { TikTokPublishClient } from './client/tiktok.ts';
const client = new TikTokPublishClient(accessToken);

// 新版本
import { SocialMediaClientFactory } from './client/factory.ts';
const factory = SocialMediaClientFactory.getInstance(database);
const client = factory.getClient('tiktok');
```

## 最佳实践

### 1. 平台检测
```typescript
// 检查平台是否支持
if (factory.isPlatformSupported(platform)) {
  const client = factory.getClient(platform);
  // 使用客户端
}
```

### 2. 错误处理
```typescript
try {
  const result = await worker.processTask(taskId);
  if (result.success) {
    console.log(`Success: ${result.message}`);
  } else {
    console.error(`Failed: ${result.message} - ${result.error}`);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### 3. 批量操作
```typescript
// 优先使用批量方法
await worker.processAllPendingTasksForPlatform('tiktok');
await worker.processAllAccountsNeedingRefreshForPlatform('x');
```

## 故障排除

### 常见问题
1. **平台不支持**: 检查平台名称是否正确，确保在工厂中注册
2. **客户端获取失败**: 检查数据库连接和工厂初始化
3. **任务状态更新失败**: 检查数据库权限和表结构

### 调试技巧
1. 启用详细日志记录
2. 检查平台支持状态
3. 验证客户端实例
4. 监控任务处理状态

## 总结

重构后的worker提供了：

- **更好的可扩展性**: 轻松添加新平台
- **统一的接口**: 一致的错误处理和状态管理
- **增强的功能**: 批量操作和平台特定处理
- **更好的维护性**: 代码结构清晰，职责分离

通过这些改进，系统现在可以更高效地处理多平台社交媒体任务，同时保持代码的可维护性和可扩展性。
