# 调研与结论：release-web-v2-0-10

- 任务 ID：`release-web-v2-0-10-2026-07-26_11-55-11`
- 创建时间：`2026-07-26_11-55-11`

## 需求事实

- 用户明确要求完成 push、PR、合并和 Web 发布。
- QQ 群号变更已通过 PR #297 合并到 `main`，merge commit 为 `6de67562`。

## 真实调用链

- `apps/web/package.json` 提供 Web 版本号。
- 推送 `web-v*` tag 后，Leo webhook 触发 `leaperone/leaperone-releases` 的 `Deploy MultiPost`。
- 下游完成构建、迁移和 DE 部署后，`multipost.app` 才会更新。

## 调研结论

- 当前最新 Web tag 是 `web-v2.0.9`，下一版本为 `web-v2.0.10`。
- 生产 `/about` 联系卡片当前仍是 `867578227`，页脚链接已含新号，验收必须精确匹配联系卡片。

## 技术决策

| 决策 | 证据 |
|---|---|
| bump 到 `2.0.10` | `apps/web/package.json` 当前为 `2.0.9`，最新生产 tag 同为 `web-v2.0.9` |
| 部署后检查 HTML 和 health | tag 或 workflow 启动都不能单独证明生产已更新 |

## 风险与边界

- 不能在 dirty 主 checkout 打 tag。
- 发布工作流失败时保留 tag 和 run 证据，不把 tag 存在表述为发布成功。

## 参考指针

- PR #297
- `apps/web/package.json`
- `leaperone/leaperone-releases` / `Deploy MultiPost`
- `https://multipost.app/about`
- `https://multipost.app/api/health`
