# 任务计划：update-about-qq-group

- 任务 ID：`update-about-qq-group-2026-07-26_11-23-06`
- 创建时间：`2026-07-26_11-23-06`

## 目标

将 MultiPost 官网 `/about` 页面展示的 QQ 群号从 `867578227` 更新为 `921137242`。
将变更推送、通过 PR 合并，并发布到 Web 生产环境。

## 范围

- 仅修改 `apps/web/src/routes/_default/about.tsx` 中“联系我们”区域的 QQ 群号。
- 保留页面结构、样式和其他联系方式不变。

## 非目标

- 不修改隐私政策、服务条款或其他页面中的群号。
- 不调整页脚已有的 QQ 群链接。

## 关键约束

- 用户明确指定目标 URL 为 `https://multipost.app/about`。
- 主 checkout 存在其他任务的未提交修改，必须使用独立 worktree。
- 遵循仓库要求，只运行 lint，不在开发阶段运行 build。

## 修改路径

- `apps/web/src/routes/_default/about.tsx`
- 项目开发基线文件和本任务 planning 文件

## 验证方式

- 精确搜索确认 `/about` 源码只剩新群号。
- 对目标文件运行 ESLint。
- 检查 Git diff，确认业务修改仅为群号替换。
- 核对 PR 合并状态、Web 发布 tag、部署工作流和生产 HTML。

## 执行状态

- [x] 完成只读探索并确认真实调用链
- [x] 完成实现
- [x] 完成验证
- [x] 完成 Git 收尾
- [x] 完成 PR 合并
- [x] 完成 Web 生产发布与线上验证

## 决策

| 决策 | 理由 |
|---|---|
| 只改 about 页 | 用户给出明确 URL；其他页面不在本轮范围内 |
| 不新增常量或抽象 | 单处静态文案替换，现有结构已经满足需求 |
| 使用下一个 `web-v*` 补丁版本发布 | 仓库 Web 生产发布由 tag 驱动 |

## 错误与处理

| 错误 | 尝试 | 处理结果 |
|---|---:|---|
| worktree 脚本刷新远端时 SSH 无响应 | 1 | 中止挂起命令，使用本地 `origin/main` 提交继续创建 |
| zsh 保留变量 `path` 覆盖 PATH | 1 | 改用 `wt` 变量，确认此前未执行 Git 操作 |
| rebase 时 `CLAUDE.md` 文件类型冲突 | 1 | 以最新 `origin/main` 的项目指引内容生成 `AGENTS.md`，保留 `CLAUDE.md -> AGENTS.md` 基线 |
| worktree 首次 build 缺少独立依赖链接 | 1 | 按冻结 lockfile 离线安装链接后，正式 Web build 通过 |
