---
name: release
description: 在主分支打 tag 触发 CI/CD 部署。支持功能版本和 Build 版本。
user_invocable: true
arguments: "[--build | --patch | --minor | --major] [--dry-run]"
---

# Release - 生产环境发布

在 main 分支打 tag 推送到远程，触发 CI/CD 部署。

## 版本策略

| 类型 | 格式 | 场景 |
|------|------|------|
| Build | `v3.16.0-build.1` | 热补丁、配置调整 |
| Patch | `v3.16.1` | Bug 修复 |
| Minor | `v3.17.0` | 新功能 |
| Major | `v4.0.0` | 重大变更 |

## 核心原则

1. **所有发布都需要用户确认**
2. **同步维护 package.json 版本号**

## 流程

### Step 1: 检查分支

必须在 main 分支。

```bash
git branch --show-current
```

### Step 2: 获取变更

```bash
LAST_TAG=$(git tag --sort=-v:refname | head -1)
git log ${LAST_TAG}..HEAD --oneline
```

### Step 3: 确定版本类型

**无参数时**：展示变更，给出建议，询问用户选择。

**有参数时**：跳过选择，直接进入下一步。

建议规则：
- 只有 `perf:`/`refactor:`/`chore:` → build
- 有 `fix:` → patch
- 有 `feat:` → minor
- 有 breaking change → major

### Step 4: 计算新版本号

```bash
# 获取最新功能版本
git tag --sort=-v:refname | grep -E "^v[0-9]+\.[0-9]+\.[0-9]+$" | head -1

# 获取当前版本的最新 build 号（用于 build 版本）
git tag --sort=-v:refname | grep "^v3.16.0-build" | head -1
```

### Step 5: 更新 package.json

更新 `package.json` 中的 version 字段为新版本号（不含 `v` 前缀）。

```bash
# 示例：更新为 3.17.0
npm pkg set version="3.17.0"
```

### Step 6: 用户最终确认

展示：
- 当前版本 → 新版本
- 变更摘要
- 将要创建的 tag

等待用户确认发布。

### Step 7: 执行发布

```bash
# 提交 package.json 变更
git add package.json
git commit -m "chore: bump version to v3.17.0"
git push origin main

# 打 tag
git tag v3.17.0
git push origin v3.17.0
```

## 查看版本历史

```bash
git tag --sort=-v:refname | head -20
git tag -l "v3.16.0*" --sort=-v:refname  # 某版本的所有 build
```

## 回滚

```bash
git tag -d <tag>
git push origin :refs/tags/<tag>
```

## --dry-run 模式

使用 `--dry-run` 参数时，只展示将要执行的操作，不实际执行：
- 显示版本变更
- 显示将要创建的 tag
- 不修改任何文件
- 不推送任何内容
