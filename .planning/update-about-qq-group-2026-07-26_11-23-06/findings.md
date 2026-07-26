# 调研与结论：update-about-qq-group

- 任务 ID：`update-about-qq-group-2026-07-26_11-23-06`
- 创建时间：`2026-07-26_11-23-06`

## 需求事实

- 用户要求把 `https://multipost.app/about` 的 QQ 群号改为 `921137242`。
- 当前 about 页源码展示 `867578227`。

## 真实调用链

- TanStack Router 文件 `apps/web/src/routes/_default/about.tsx` 直接渲染 `/about`。
- “联系我们”区域直接包含静态 QQ 群号，没有中间配置或共享 helper。

## 调研结论

- 页脚中的 QQ 群链接已经带有 `group_code=921137242`，无需修改。
- 隐私政策和服务条款仍含旧群号，但用户本轮只指定 about 页，不扩展范围。
- Web 发布由 `web-v*` tag 驱动；合并本身不会更新生产页面。
- 继续任务时 `origin/main` 已前进到 `6c17562`，本分支已成功 rebase。
- 当前 Web 包版本为 `2.0.9`，下一生产版本为 `web-v2.0.10`。
- `web-v*` tag 通过 Leo webhook 触发 `leaperone/leaperone-releases` 的 `Deploy MultiPost` 工作流，最终部署目标是 DE。

## 技术决策

| 决策 | 证据 |
|---|---|
| 直接替换静态文本 | 群号只在 about 路由该展示位置使用，没有可复用的现有配置 |
| 不抽取共享常量 | 本轮只改一个页面，新增抽象会扩大范围和文件数 |

## 风险与边界

- 真实线上页面只有部署后才会更新；代码合并不等于已发布。
- 不修改法律页面，避免超出用户明确边界。
- 发布完成需要同时验证 tag、部署工作流和生产 HTML，不能只以 PR merged 为准。

## 参考指针

- `apps/web/src/routes/_default/about.tsx:172`
- `apps/web/src/components/Footer.tsx:32`
- `apps/web/src/routes/_default/legal/privacy.tsx:165`
- `apps/web/src/routes/_default/legal/terms.tsx:225`
