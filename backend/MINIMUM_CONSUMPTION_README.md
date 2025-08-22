# Minimum Consumption Worker

## 概述

Minimum Consumption Worker 是一个后台任务处理器，用于确保用户满足最低消费要求。该 worker 每月运行一次，检查用户上个月的信用使用情况，并在必要时进行信用调整。

## 功能特性

- **月度检查**: 每月1号00:05自动运行
- **智能扣费**: 优先从免费信用中扣除，不足时从付费信用中扣除
- **事务安全**: 使用数据库事务确保数据一致性
- **详细日志**: 提供完整的处理日志和统计信息

## 工作原理

### 1. 时间范围计算
- 检查上个月的信用使用情况
- 时间范围：上个月1号00:00:00 到 本月1号00:00:00（不包含）

### 2. 消费要求
- **最低阈值**: 用户必须至少消费 1 个信用
- **目标消费**: 每月最低消费 5 个信用
- **调整条件**: 当 1 ≤ 实际消费 < 5 时，自动扣除差额

### 3. 扣费策略
1. **优先扣除免费信用**: 从用户的免费信用余额中扣除
2. **补充扣除付费信用**: 免费信用不足时，从付费信用中扣除
3. **允许负余额**: 付费信用可以变为负数，确保用户满足最低消费要求

### 4. 记录追踪
- 创建 `MINIMUM_CONSUMPTION_ADJUSTMENT` 类型的信用使用记录
- 区分免费和付费信用的扣除情况
- 更新用户的信用余额

## 配置

### Cron 表达式
```bash
# 每月1号00:05执行
5 0 1 * *
```

### 环境变量
无需额外配置，使用默认的 Prisma 数据库连接。

## 数据库操作

### 涉及的表
- `user`: 用户信息
- `credit`: 用户信用余额
- `creditUsage`: 信用使用记录

### 事务操作
```typescript
await multipostDb.$transaction(async (tx) => {
  // 1. 查询用户信用余额
  // 2. 计算扣除金额
  // 3. 更新信用余额
  // 4. 创建使用记录
});
```

## 日志输出

### 启动日志
```
🕐 Starting minimum consumption check cron job...
📅 Checking consumption for period: 2024-06-01T00:00:00.000Z (inclusive) to 2024-07-01T00:00:00.000Z (exclusive)
👥 Processing 150 users for minimum consumption check
```

### 处理日志
```
👤 User abc123: Total credit usage last month = 2.5
💰 User abc123: Needs to deduct 2.5 to meet minimum consumption target of 5.
✅ User abc123: Successfully deducted 2.5 (Free: 2.5, Paid: 0) for minimum consumption adjustment.
```

### 完成日志
```
✅ Minimum consumption check completed:
   - Total users processed: 150
   - Users with adjustments: 25
   - Errors encountered: 0
```

## 错误处理

### 常见错误场景
1. **用户无信用记录**: 跳过处理，记录警告日志
2. **信用不足**: 扣除可用信用，记录警告日志
3. **数据库错误**: 捕获异常，记录错误日志，继续处理其他用户

### 错误恢复
- 单个用户处理失败不影响其他用户
- 所有错误都会记录到日志中
- 支持手动重新运行检查

## 监控和维护

### 健康检查
- 通过 `/health` 端点监控服务状态
- 检查 cron 任务是否正常运行
- 监控数据库连接状态

### 性能优化
- 批量处理用户数据
- 使用数据库事务减少连接开销
- 异步处理避免阻塞主线程

## 部署说明

### 依赖要求
- Deno 运行时环境
- PostgreSQL 数据库
- Prisma ORM

### 启动命令
```bash
cd backend
deno run --allow-env --allow-net --allow-read main.ts
```

### Docker 部署
```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app
COPY . .

RUN deno cache main.ts

EXPOSE 9000

CMD ["deno", "run", "--allow-env", "--allow-net", "--allow-read", "main.ts"]
```

## 故障排除

### 常见问题
1. **Cron 任务未执行**: 检查 Deno 环境变量和权限
2. **数据库连接失败**: 验证 Prisma 配置和数据库状态
3. **信用扣除异常**: 检查用户信用记录和事务日志

### 调试模式
启用详细日志输出：
```typescript
console.log('Debug mode enabled');
// 添加更多调试信息
```

## 版本历史

- **v1.0.0**: 初始版本，支持基本的月度消费检查
- 支持免费和付费信用的智能扣除
- 完整的错误处理和日志记录
