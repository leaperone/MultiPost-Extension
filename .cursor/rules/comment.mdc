---
description: writing or editing code
globs: *.tsx, *.js, *.ts
alwaysApply: false
---
# Code Commenting Guidelines

## 基本原则 Basic Principles
- 注释应该解释**为什么**这样做，而不是**做了什么**
- 代码即文档，仅在必要时添加注释
- 使用清晰简洁的语言，避免冗余, English
- 及时更新注释，确保与代码同步

## 文件头注释 File Header Comments
```typescript
/**
 * @file 文件的简要描述
 * @description 详细描述文件的功能和用途
 * @author [作者名称]
 * @date YYYY-MM-DD
 */
```

## 函数注释 Function Comments
```typescript
/**
 * 函数的简要描述
 * @description 详细描述函数的功能
 * @param {string} param1 - 参数1的描述
 * @param {number} param2 - 参数2的描述
 * @returns {Promise<boolean>} 返回值的描述
 * @throws {Error} 可能抛出的错误
 * @example
 * const result = await someFunction('test', 123);
 */
function someFunction(param1: string, param2: number): Promise<boolean> {
  // ...
}
```

## 行内注释 Inline Comments
```typescript
// ✅ 好的注释：解释复杂的业务逻辑
if (user.role === 'admin' && !isHoliday) {
  // 管理员在非假日期间具有特殊权限
  grantSpecialAccess();
}

// ❌ 不好的注释：陈述显而易见的事实
// 检查用户是否为管理员
if (user.role === 'admin') {
  // ...
}
```

## 待办注释 TODO Comments
```typescript
// TODO(github-username): 实现用户认证功能 (#123)
// FIXME(github-username): 修复内存泄漏问题 (#456)
// NOTE: 这里使用递归可能会导致性能问题
```

## 类型定义注释 Type Definition Comments
```typescript
/**
 * 用户配置接口
 * @interface UserConfig
 * @property {string} name - 用户名
 * @property {number} age - 年龄
 * @property {string[]} permissions - 权限列表
 */
interface UserConfig {
  name: string;
  age: number;
  permissions: string[];
}
```

## 常量和枚举注释 Constants and Enum Comments
```typescript
/**
 * 用户角色枚举
 * @enum {string}
 */
enum UserRole {
  /** 管理员用户 */
  ADMIN = 'admin',
  /** 普通用户 */
  USER = 'user',
  /** 访客用户 */
  GUEST = 'guest',
}

/** 最大重试次数 */
const MAX_RETRY_COUNT = 3;
```

## 弃用注释 Deprecation Comments
```typescript
/**
 * @deprecated 从 v2.0.0 开始弃用，请使用 `newFunction()` 替代
 * @see {@link newFunction}
 */
function oldFunction() {
  // ...
}
```

## 区块注释 Section Comments
```typescript
//===================================
// 初始化配置
//===================================

//===================================
// 工具函数
//===================================

//===================================
// 事件处理
//===================================
```

## 注释规范检查 Comment Linting
- 使用 ESLint 的 `eslint-plugin-jsdoc` 插件检查注释格式
- 在 CI/CD 流程中包含注释检查
- 定期审查和更新过时的注释

## 最佳实践 Best Practices
- 使用 JSDoc 风格的注释以获得更好的 IDE 支持
- 为公共 API 和复杂的业务逻辑编写详细注释
- 避免注释掉的代码，使用版本控制系统代替
- 定期清理无用和过时的注释 