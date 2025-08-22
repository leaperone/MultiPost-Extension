# X (Twitter) 客户端文档

## 概述

X客户端是一个完整的X平台集成实现，支持发布推文、媒体上传、账户刷新和状态检查等功能。基于X API v2和媒体上传API构建。

## 主要功能

### 🚀 发布功能
- **推文发布**: 支持纯文本推文和带媒体附件的推文
- **媒体上传**: 支持图片、视频等媒体文件的分块上传
- **内容格式化**: 自动处理HTML标签和字符限制（280字符）
- **批量处理**: 支持多个媒体文件同时上传

### 🔄 账户管理
- **Token刷新**: 自动刷新过期的访问令牌
- **账户验证**: 验证账户状态和权限
- **元数据更新**: 同步账户信息和头像

### 📊 状态监控
- **发布状态检查**: 实时检查推文发布状态
- **错误处理**: 详细的错误信息和状态跟踪
- **日志记录**: 完整的操作日志和状态更新

## API接口

### 核心API端点
- **推文API**: `https://api.x.com/2/tweets`
- **媒体上传API**: `https://upload.twitter.com/1.1/media/upload.json`
- **状态查询API**: `https://api.x.com/2/tweets/{id}`

### 媒体上传流程
X客户端使用分块上传策略处理大文件：

1. **初始化上传** (`INIT`)
   - 指定文件大小和媒体类型
   - 获取媒体ID用于后续操作

2. **分块上传** (`APPEND`)
   - 将文件分割为1MB的块
   - 逐个上传每个块
   - 支持断点续传

3. **完成上传** (`FINALIZE`)
   - 标记上传完成
   - 返回最终的媒体ID

## 使用方法

### 基本发布流程

```typescript
import { XClient } from './client/x.ts';

const xClient = new XClient(database);

// 发布纯文本推文
const result = await xClient.processTask('task-id');

// 检查发布状态
const status = await xClient.processCheckTask('log-id', 'access-token');

// 刷新账户
const refresh = await xClient.processRefreshAccount('account-id');
```

### 媒体上传示例

```typescript
// 客户端会自动处理媒体上传
const draft = {
  content: "这是一条带图片的推文 #测试",
  files: [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ]
};

// 发布时会自动：
// 1. 下载媒体文件
// 2. 分块上传到X
// 3. 将媒体ID附加到推文
const result = await xClient.processTask('task-id');
```

## 配置要求

### 环境变量
```bash
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
```

### 权限范围
- `tweet.read` - 读取推文
- `tweet.write` - 发布推文
- `users.read` - 读取用户信息
- `offline.access` - 离线访问（刷新令牌）

## 错误处理

### 常见错误类型
- `TASK_NOT_FOUND` - 任务未找到
- `INVALID_STATUS` - 无效状态
- `NO_ACTIVE_ACCOUNT` - 没有活跃账户
- `MEDIA_UPLOAD_FAILED` - 媒体上传失败
- `TWEET_NOT_FOUND` - 推文未找到

### 错误恢复策略
- **媒体上传失败**: 自动跳过媒体，继续发布文本
- **网络错误**: 自动重试机制
- **权限错误**: 标记账户为非活跃状态

## 性能优化

### 上传优化
- **分块大小**: 1MB块大小平衡了内存使用和网络效率
- **并发上传**: 支持多个媒体文件同时处理
- **断点续传**: 支持上传中断后的恢复

### 内存管理
- **流式处理**: 大文件不会完全加载到内存
- **垃圾回收**: 及时释放临时对象
- **错误隔离**: 单个文件失败不影响其他文件

## 限制和注意事项

### X平台限制
- **推文字符**: 最大280字符
- **媒体数量**: 单条推文最多4个媒体文件
- **文件大小**: 图片最大5MB，视频最大512MB
- **文件格式**: 支持JPG、PNG、GIF、MP4等

### 技术限制
- **上传超时**: 单个块上传超时时间
- **重试次数**: 失败重试的最大次数
- **并发限制**: 同时上传的媒体文件数量

## 监控和日志

### 日志级别
- 🔄 **处理中**: 任务开始处理
- ✅ **成功**: 操作完成
- ❌ **错误**: 操作失败
- ⚠️ **警告**: 需要注意的问题
- 📸 **媒体**: 媒体上传相关操作

### 性能指标
- 媒体上传成功率
- 平均上传时间
- 推文发布延迟
- 错误率统计

## 故障排除

### 常见问题

#### 1. 媒体上传失败
```bash
# 检查网络连接
curl -I https://upload.twitter.com/1.1/media/upload.json

# 验证访问令牌
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.x.com/2/users/me
```

#### 2. 推文发布失败
```bash
# 检查账户权限
# 确认tweet.write权限已授予

# 验证内容格式
# 确保文本不超过280字符
```

#### 3. 账户刷新失败
```bash
# 检查刷新令牌
# 确认offline.access权限

# 验证客户端凭据
# 检查X_CLIENT_ID和X_CLIENT_SECRET
```

### 调试技巧
1. **启用详细日志**: 设置日志级别为DEBUG
2. **检查网络**: 验证到X API的网络连接
3. **验证令牌**: 确认访问令牌的有效性
4. **监控配额**: 检查API调用限制

## 最佳实践

### 1. 媒体处理
- 压缩图片以减少上传时间
- 使用合适的文件格式（JPG用于照片，PNG用于图形）
- 预先验证文件大小和格式

### 2. 错误处理
- 实现指数退避重试策略
- 记录详细的错误信息用于调试
- 提供用户友好的错误消息

### 3. 性能优化
- 批量处理多个任务
- 使用CDN加速媒体文件下载
- 实现缓存机制减少重复上传

## 更新日志

### v1.0.0 (2024-12-19)
- ✨ 初始版本发布
- 🚀 支持推文发布和媒体上传
- 🔄 完整的账户管理功能
- 📊 实时状态监控

### 即将推出
- 🔐 OAuth 2.0 PKCE流程集成
- 📱 移动端优化
- 🌐 国际化支持
- 📈 高级分析功能

## 贡献指南

欢迎提交问题和功能请求，共同改进X客户端！

### 开发环境设置
```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install

# 设置环境变量
cp .env.example .env

# 运行测试
npm test
```

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint代码规范
- 编写完整的JSDoc注释
- 添加单元测试覆盖

---

**注意**: 本客户端基于X官方API文档开发，请确保遵守X的开发者条款和使用政策。
