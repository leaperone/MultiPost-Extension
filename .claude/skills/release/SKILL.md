---
name: release
description: 发布 MultiPost 组件到生产环境。支持 web/worker/desktop，打 tag 触发 CI/CD 并持续监控。
user_invocable: true
arguments: "<web|worker|desktop> [--build | --patch | --minor | --major] [--dry-run]"
---

# Release - MultiPost 生产环境发布

在 main 分支打 tag 推送到远程，触发 CI/CD 部署，然后持续监控直到完成或失败。

## 组件配置

| 组件 | Tag 前缀 | 部署目标 | 监控仓库 | Workflow |
|------|----------|----------|----------|----------|
| web | `web-v` | HK 云服务器 | leaperone/leaperone-releases | deploy-multipost.yml |
| worker | `worker-v` | PVE 容器 | leaperone/leaperone-releases | deploy-multipost.yml |
| desktop | `desktop-v` | GitHub Release + S3 CDN | leaperone/MultiPost-Desktop-Release | build-on-tag.yml |

**无参数时**：询问用户要发布哪个组件。

## 版本策略

| 类型 | 格式 | 场景 |
|------|------|------|
| Build | `web-v1.1.9-build.13` | 热补丁、配置调整 |
| Patch | `web-v1.1.10` | Bug 修复 |
| Minor | `web-v1.2.0` | 新功能 |
| Major | `web-v2.0.0` | 重大变更 |

## 核心原则

1. **所有发布都需要用户确认**
2. **同步维护 package.json 版本号**

## 流程

### Step 1: 检查分支

必须在 main 分支，无未提交变更。

```bash
git branch --show-current
git status --porcelain
git fetch origin main
```

### Step 2: 获取变更

```bash
# 获取当前组件的最新 tag
LAST_TAG=$(git tag --sort=-v:refname | grep "^<prefix>v" | head -1)
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
# 获取最新功能版本（不含 build 后缀）
git tag --sort=-v:refname | grep -E "^<prefix>v[0-9]+\.[0-9]+\.[0-9]+$" | head -1

# 获取当前版本的最新 build 号（用于 build 版本）
git tag --sort=-v:refname | grep "^<prefix>v<base>-build" | head -1
```

### Step 5: 更新 package.json

更新 `package.json` 中的 version 字段为新版本号（不含前缀和 `v`）。

```bash
npm pkg set version="<new_version>"
```

### Step 6: 用户最终确认

展示：
- 当前版本 → 新版本
- 变更摘要
- 将要创建的 tag
- 部署目标

等待用户确认发布。

### Step 7: 执行发布

```bash
# 提交 package.json 变更
git add package.json
git commit -m "chore: bump version to <prefix>v<new_version>"
git push origin main

# 打 tag
git tag <prefix>v<new_version>
git push origin <prefix>v<new_version>
```

### Step 8: 等待并找到 workflow run

Tag push 后有两层触发：
1. MultiPost 仓库的 trigger workflow 运行
2. 它 dispatch 到目标仓库触发实际 build/deploy workflow

```bash
sleep 5

# Web/Worker: 查找 leaperone-releases 的 deploy run
gh run list -R leaperone/leaperone-releases --workflow=deploy-multipost.yml --limit=1 --json databaseId,status,conclusion,createdAt

# Desktop: 查找 MultiPost-Desktop-Release 的 build run
gh run list -R leaperone/MultiPost-Desktop-Release --workflow=build-on-tag.yml --limit=1 --json databaseId,status,conclusion,createdAt
```

如果没有找到新的 run，再等几秒重试（最多重试 3 次）。

### Step 9: 持续监控

**Web/Worker** (通常 5-10 分钟)：

```bash
gh run watch <run-id> -R leaperone/leaperone-releases
```

**Desktop** (通常 15-30 分钟，含 macOS 签名/公证)：
Desktop 构建较慢，使用轮询而非 watch：

```bash
# 每 30 秒检查一次
gh run view <run-id> -R leaperone/MultiPost-Desktop-Release --json status,conclusion,jobs
```

### Step 10: 结果处理

**成功：**
- 汇报部署完成和耗时
- 显示 workflow run 链接
- Desktop: 额外显示 GitHub Release 链接

**失败：**

```bash
# 获取失败日志
gh run view <run-id> -R <repo> --log-failed | tail -100
```

1. 分析错误日志，识别根因
2. 给出具体的修复建议
3. 询问用户是否需要回滚 tag

## 回滚

```bash
git tag -d <tag>
git push origin :refs/tags/<tag>
```

## --dry-run 模式

使用 `--dry-run` 参数时，只展示将要执行的操作：
- 显示版本变更
- 显示将要创建的 tag
- 不修改任何文件
- 不推送任何内容

## 注意事项

- Tag 格式: `web-v*` / `worker-v*` / `desktop-v*`，CI/CD 依赖此格式
- 只在 main 分支打 tag
- **永远不要自动推送**，每一步都需要用户确认
