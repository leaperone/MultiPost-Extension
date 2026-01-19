---
name: deploy
description: 在主分支打 tag 触发 CI/CD 部署。检查 changelog、package.json、git tag 版本号一致性，统一后推送 tag 到远程。
user_invocable: true
---

# Deploy - 生产环境部署

在主分支打 tag 推送到远程，触发 CI/CD 自动部署到生产环境。

## 前置检查

部署前需要确保以下三处版本号一致：

| 位置 | 文件/命令 | 格式 |
|------|-----------|------|
| Changelog | `app/(others)/changelog/data.ts` → `logs[0].version` | `v1.x.x` |
| Package | `package.json` → `version` | `1.x.x` (无 v 前缀) |
| Git Tag | `git tag --sort=-v:refname \| head -1` | `v1.x.x` |

## Workflow

### Step 1: 确认在主分支

```bash
git branch --show-current
# 必须是 main 分支
```

如果不在 main 分支，询问用户是否切换。

### Step 2: 检查 Changelog 是否更新

读取 `app/(others)/changelog/data.ts`，获取 `logs[0].date` 和 `logs[0].version`。

**检查规则：**
- 如果 `logs[0].date` 不是今天，提醒用户：
  > ⚠️ Changelog 最新日期是 `{date}`，不是今天。建议先运行 `/changelog after` 更新变更日志。
- 询问用户是否继续部署或先更新 changelog

### Step 3: 获取并对比三个版本号

```bash
# 1. Changelog 版本 (从 data.ts 读取 logs[0].version)
# 例如: v3.15.1

# 2. Package.json 版本
cat package.json | grep '"version"' | head -1
# 例如: "version": "3.15.1"

# 3. 最新 Git Tag
git tag --sort=-v:refname | head -1
# 例如: v3.15.1
```

### Step 4: 版本号一致性检查

对比三个版本号（注意 package.json 没有 `v` 前缀）：

| 场景 | 操作 |
|------|------|
| 三者一致 | ✅ 直接进入 Step 5 |
| Changelog > Package/Tag | 需要更新 package.json 和打新 tag |
| 版本号不一致 | 提示用户并给出修复建议 |

**如果需要更新 package.json：**

```bash
# 使用 npm version 更新（不自动打 tag）
npm version <new_version> --no-git-tag-version

# 或手动编辑 package.json
```

**注意：** 优先以 Changelog 版本为准，因为 changelog 记录了用户可见的变更。

### Step 5: 确保代码已推送

```bash
# 检查是否有未推送的 commits
git status
git log origin/main..HEAD --oneline
```

如果有未推送的 commits：

```bash
git push origin main
```

### Step 6: 打 Tag 并推送

```bash
# 创建 tag（使用 changelog 中的版本号）
git tag v<version>

# 推送 tag 到远程（触发 CI/CD）
git push origin v<version>
```

### Step 7: 确认部署

```bash
# 验证 tag 已推送
git ls-remote --tags origin | grep v<version>
```

输出部署确认信息：
> ✅ Tag `v<version>` 已推送到远程，CI/CD 部署已触发。

## 完整检查清单

执行前请确认：

- [ ] 当前在 main 分支
- [ ] Changelog 已更新（`logs[0].date` 是今天或最近）
- [ ] 三个版本号一致：
  - `data.ts` → `logs[0].version`
  - `package.json` → `version`
  - 最新 git tag
- [ ] 所有代码已推送到远程
- [ ] 没有进行中的 PR 需要合并

## 版本号同步命令

如果版本号不一致，按以下顺序同步：

```bash
# 1. 以 changelog 版本为准，假设是 v1.16.0

# 2. 更新 package.json（去掉 v 前缀）
npm version 1.16.0 --no-git-tag-version

# 3. 提交更改
git add package.json
git commit -m "chore: bump version to 1.16.0"

# 4. 推送代码
git push origin main

# 5. 打 tag 并推送
git tag v1.16.0
git push origin v1.16.0
```

## 回滚

如果部署出问题需要回滚：

```bash
# 删除本地 tag
git tag -d v<version>

# 删除远程 tag
git push origin :refs/tags/v<version>
```

## Notes

- Tag 格式必须是 `v1.x.x`，CI/CD 配置依赖此格式
- 只在 main 分支打 tag
- 部署前确保所有测试通过
- **永远不要自动推送**，每一步都需要用户确认
