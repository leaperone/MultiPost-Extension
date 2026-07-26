# 任务计划：release-web-v2-0-10

- 任务 ID：`release-web-v2-0-10-2026-07-26_11-55-11`
- 创建时间：`2026-07-26_11-55-11`

## 目标

发布 MultiPost Web `2.0.10`，将已合并的 `/about` QQ 群号更新部署到生产环境。

## 范围

- 将 `apps/web/package.json` 版本从 `2.0.9` 更新为 `2.0.10`。
- 合并版本提交后创建并推送 `web-v2.0.10` tag。
- 监督 `leaperone/leaperone-releases` 的 `Deploy MultiPost` 工作流并验证生产页面。

## 非目标

- 不修改业务代码、数据库 schema 或其他 app 版本。

## 关键约束

- tag 必须指向包含版本号和 QQ 群号变更的最新 `main`。
- 只有部署工作流成功且生产 HTML 更新后才算发布完成。

## 修改路径

- `apps/web/package.json`
- `.planning/release-web-v2-0-10-2026-07-26_11-55-11/*`

## 验证方式

- 校验版本号和 diff。
- 运行 Web lint/build 或复用同一合并提交已通过的发布级验证，并核对 release diff 仅为版本号。
- 核对 PR、merge commit、tag、部署 run、health 和 `/about` 联系卡片 HTML。

## 执行状态

- [x] 完成只读探索并确认真实调用链
- [x] 完成实现
- [x] 完成验证
- [x] 完成 Git 收尾

## 决策

| 决策 | 理由 |
|---|---|
| 发布补丁版本 `2.0.10` | 当前生产 tag 为 `web-v2.0.9`，本次是单点文案更新 |
| 使用独立发布分支和 worktree | 主 checkout 有其他任务改动，不能作为发布源 |

## 错误与处理

| 错误 | 尝试 | 处理结果 |
|---|---:|---|
| 无 | 1 | 无需处理 |
