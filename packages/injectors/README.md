# @multipost/injectors

MultiPost 平台注入脚本的**单一事实源**,由 desktop 与 web 共享。脚本曾寄居在 `apps/extension` submodule,现已迁入主仓,这样 web build 不再依赖 submodule、desktop 与 web 永远同源。

## 目录

- `src/{article,dynamic,video,podcast}/*.ts` — 106 个平台的发布注入脚本(对平台创作页 DOM 填表发布)。
- `src/types.ts` — 脚本共享的 `SyncData` / `ArticleData` / `VideoData` 等纯类型(脚本一律 `import type`)。
- `src/helper.ts` + `src/helper/*` — MAIN-world content helper(B 站动态图片上传等)。
- `build/index.mjs` — 参数化的 esbuild 编译管线(Node-only)。desktop 与 web 各自调用,只是源根/工作目录不同。
- `build/normalize.mjs` — 路径注释规范化(无依赖,主进程也可安全引用)。

## 三条消费路径

1. **desktop 内置** — `apps/desktop` build 时编译进 `virtual:injector-bundles`,运行时 `executeJavaScript` 注入。这是**权威兜底**,永远可用。
2. **web 静态下发** — `apps/web` build 时(仅 client 环境)把脚本编成 `dist/client/injectors/<key>.<sha>.js` + `manifest.json`,随发版公开,manifest 走 `no-cache`、bundle 内容寻址可长缓存。
3. **desktop 热更新** — desktop 拉 web 的 manifest,校验 sha 后缓存,注入时优先用远端(仅当内容比内置更新)。

## 如何热修一个平台脚本(runbook)

平台改版导致选择器失效时:

1. 改 `packages/injectors/src/<type>/<platform>.ts`。
2. (可选)`pnpm --filter multipost-desktop hash:injectors` 确认编译通过。
3. 若 `apps/extension` 仍维护同平台,同步改 `apps/extension/src/sync/<type>/<platform>.ts` —— 否则 `injector-drift` CI 会失败。
4. 发一版 web(`web-v*` tag)。几分钟内 desktop 拉到新脚本生效,**无需发 desktop 版**。

> 前提:用户 desktop 已开启 `injectorHotUpdate.enabled`(灰度期默认关,见 `appSettings.ts`)。

## 内容寻址 & sha

manifest 用脚本的**规范化 sha**(剥掉 esbuild 的路径注释)做内容寻址。desktop 内置与 web 产出对相同源码得到相同 sha,所以未改动的脚本不会被重复下载。校验逻辑在 `build/normalize.mjs`(desktop 主进程下载校验内联了同一份正则)。

## 防分叉

`scripts/check-extension-drift.mjs` 比对 extension 与本包对应脚本,漂移则 CI fail(`.github/workflows/injector-drift.yml`)。sync 脚本按**源文本**比对(规范化掉 `../types` vs `../common`/`~sync/common` 的 type-import 路径差异),所以**无需在 extension submodule 装第三方依赖**(如 aliyun 的 turndown);content helper 因迁移时改过(去 Plasmo)按编译产物比对。extension submodule 缺席时自动跳过。本地手动跑:

```bash
node packages/injectors/scripts/check-extension-drift.mjs
```

## 可用性红线(最高优先级)

热更新是**纯增强层**,绝不能成为新故障点。`InjectorRegistry.getActiveBundle` 同步、永不抛、永不返回比内置更差的结果。任何一环失效(网络/服务/缓存/脚本本身)都无声降级到内置:

- 远端脚本注入失败 → **同一次发布调用内立即用内置重试**(`executeExtensionFill`),再计熔断。熔断只是第二道防线。
- 缓存被篡改(重算 sha 不符)、manifest 解析失败、404/超时、flag 关 → 一律回退内置。

## 安全模型(本期不签名)

远端下发不做离线签名,信任自有 web 基础设施 + HTTPS。脚本本就在 public extension 仓库开源,公开下发零顾虑。爆炸半径靠三条 desktop 端硬约束:**只覆盖内置已知 key、远端不能改 injectUrl/accountKey、失败熔断 + 同次回退内置**。manifest 预留 `signature` 字段,日后要加 ed25519 离线签名不返工。

## 范围说明

本包含全部 106 个平台脚本(extension `sync/{article,dynamic,video,podcast}` 四类全集),以 `apps/desktop/.../bundleEntries.json` 为准。`article/aliyun.ts` 用 `turndown`(已加入本包依赖);日后新增平台时一并迁入本包并按需补依赖。
